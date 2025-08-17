import { ArtStyle } from './types';
import stylesConfig from '../config/styles.config.json';

export interface ModelJob {
  model: 'flux-schnell' | 'sdxl';
  useLora: boolean;
  loraKey?: string;
}

export interface LoRAConfig {
  repo: string;
  url: string;
  scale: number;
  trigger: string;
}

export interface ModelConfig {
  version: string;
  params: Record<string, any>;
  supportsLora: boolean;
  costTier: string;
}

/**
 * Choose the best model and LoRA configuration using OpenAI's "SDXL+LoRA first" strategy
 */
export function chooseModelJob(style: ArtStyle, peopleCount: number, peopleCloseUp: boolean): ModelJob {
  const styleKey = style.toLowerCase();
  const styleConfig = stylesConfig.styles[styleKey as keyof typeof stylesConfig.styles] as any;
  
  if (!styleConfig) {
    return { model: 'sdxl', useLora: false };
  }

  // Refined routing logic based on testing feedback
  const needsFlux = peopleCount >= 3 || peopleCloseUp;
  
  // ALWAYS SDXL for impressionist (texture priority, human rendering less critical)
  if (styleKey === 'impressionist') {
    return styleConfig.primary as ModelJob; // Always SDXL+LoRA
  }
  
  // For other styles, check if we need Flux for multiple people scenarios
  if (needsFlux && 'ifManyPeople' in styleConfig) {
    return styleConfig.ifManyPeople as ModelJob;
  }

  // Default: Use SDXL+LoRA (primary choice)
  if (styleConfig.primary) {
    return styleConfig.primary as ModelJob;
  }

  // Fall back to first fallback
  if (styleConfig.fallbacks && styleConfig.fallbacks.length > 0) {
    return styleConfig.fallbacks[0] as ModelJob;
  }

  return { model: 'sdxl', useLora: false };
}

/**
 * Legacy method for backward compatibility
 */
export function chooseModelJobLegacy(style: ArtStyle, hasPeople: boolean): ModelJob {
  // Convert legacy boolean to new format
  const peopleCount = hasPeople ? 1 : 0;
  const peopleCloseUp = false; // Conservative default
  return chooseModelJob(style, peopleCount, peopleCloseUp);
}

/**
 * Get LoRA configuration for a given LoRA key
 */
export function getLoRAConfig(loraKey: string): LoRAConfig | null {
  const lora = stylesConfig.loras[loraKey as keyof typeof stylesConfig.loras];
  return lora || null;
}

/**
 * Get model configuration
 */
export function getModelConfig(model: 'flux-schnell' | 'sdxl'): ModelConfig {
  return stylesConfig.models[model];
}

/**
 * Get negative prompt for style and model
 */
export function getNegativePrompt(style: ArtStyle, model: 'flux-schnell' | 'sdxl'): string {
  const negatives = (stylesConfig as any).negativePrompts;
  if (!negatives) return "";
  
  if (model === 'flux-schnell') {
    return negatives.flux || "";
  } else {
    const styleKey = style.toLowerCase();
    return negatives.sdxl?.[styleKey] || "";
  }
}

/**
 * Auto-tune LoRA scale based on style and prompt complexity
 */
export function autoTuneLoRAScale(loraConfig: LoRAConfig, style: ArtStyle, promptLength: number): number {
  if (!loraConfig) return 0;
  
  let scale = loraConfig.scale;
  const styleKey = style.toLowerCase();
  
  // Boost scale for complex prompts (more style adherence needed)
  if (promptLength > 150) {
    scale = Math.min(scale + 0.05, 0.95);
  }
  
  // Style-specific adjustments based on testing feedback
  switch (styleKey) {
    case 'impressionist':
      // Already quite high at 0.85, but boost for complex scenes
      if (promptLength > 200) scale = Math.min(scale + 0.05, 0.9);
      break;
    case 'oil_painting':
      // Good balance at 0.75, boost slightly for texture-heavy scenes
      if (promptLength > 180) scale = Math.min(scale + 0.05, 0.85);
      break;
    case 'watercolour':
    case 'pastel':
      // Already balanced at 0.8, minimal adjustment
      break;
    case 'storybook':
      // Lower scale works better, don't boost much
      if (promptLength > 200) scale = Math.min(scale + 0.03, 0.75);
      break;
    case 'pencil_ink':
      // Good at 0.75, boost for detailed scenes
      if (promptLength > 180) scale = Math.min(scale + 0.05, 0.8);
      break;
  }
  
  return scale;
}

/**
 * Build a style-appropriate prompt
 */
export function buildStylePrompt(
  style: ArtStyle, 
  subject: string, 
  setting: string, 
  useLora: boolean
): string {
  const styleKey = style.toLowerCase();
  const promptConfig = stylesConfig.prompts[styleKey as keyof typeof stylesConfig.prompts];
  
  if (!promptConfig) {
    return `A beautiful ${style} artwork of ${subject} in ${setting}`;
  }

  const template = useLora ? promptConfig.withLora : promptConfig.withoutLora;
  
  return template
    .replace('{subject}', subject)
    .replace('{setting}', setting);
}

/**
 * Get routing reason for logging (new optimized logic)
 */
export function getRoutingReason(style: ArtStyle, peopleCount: number, peopleCloseUp: boolean, job: ModelJob): string {
  const styleKey = style.toLowerCase();
  
  // Always SDXL for impressionist (texture priority)
  if (styleKey === 'impressionist') {
    return `${style} always uses SDXL+LoRA for texture fidelity`;
  }
  
  // Flux only for multiple people or close-ups
  if (job.model === 'flux-schnell') {
    if (peopleCount >= 3) {
      return `${peopleCount}+ people → Flux for multiple faces`;
    }
    if (peopleCloseUp) {
      return `close-up faces → Flux for detail`;
    }
    return `people scenario → Flux fallback`;
  }
  
  // SDXL+LoRA is now the preferred default
  if (job.model === 'sdxl' && job.useLora) {
    return `SDXL+LoRA for superior ${style} texture`;
  }
  
  return `${style} optimization → ${job.model.toUpperCase()}`;
}

/**
 * Legacy routing reason for backward compatibility
 */
export function getRoutingReasonLegacy(style: ArtStyle, hasPeople: boolean, job: ModelJob): string {
  const peopleCount = hasPeople ? 1 : 0;
  const peopleCloseUp = false;
  return getRoutingReason(style, peopleCount, peopleCloseUp, job);
}