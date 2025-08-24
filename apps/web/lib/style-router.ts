import { ArtStyle } from './types';
import stylesConfig from '../config/styles.config.json';

export interface ModelJob {
  model: 'flux-dev-lora' | 'flux-schnell' | 'sdxl';
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
 * Choose the best model and LoRA configuration using Flux-Dev-LoRA as primary
 */
export function chooseModelJob(style: ArtStyle, peopleCount: number, peopleCloseUp: boolean): ModelJob {
  const styleKey = style.toLowerCase();
  const loraKey = getLoRAKeyForStyle(style);
  
  // Primary model: flux-dev-lora with style-specific LoRA
  const primaryJob: ModelJob = {
    model: 'flux-dev-lora',
    useLora: true,
    loraKey: loraKey
  };
  
  // Fallback to SDXL+LoRA if flux-dev-lora fails
  return primaryJob;
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
 * Get LoRA key for a given art style
 */
export function getLoRAKeyForStyle(style: ArtStyle): string {
  const mappings: Record<ArtStyle, string> = {
    [ArtStyle.WATERCOLOUR]: 'watercolour',
    [ArtStyle.OIL_PAINTING]: 'oil_paint', 
    [ArtStyle.PASTEL]: 'pastel',
    [ArtStyle.PENCIL_INK]: 'ink_sketch',
    [ArtStyle.STORYBOOK]: 'storybook',
    [ArtStyle.IMPRESSIONIST]: 'impressionist'
  };
  return mappings[style] || 'watercolour';
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
export function getModelConfig(model: 'flux-dev-lora' | 'flux-schnell' | 'sdxl'): ModelConfig {
  // Default config for flux-dev-lora
  if (model === 'flux-dev-lora') {
    return {
      version: '495498c347af810c9cafabbe931c33b3acca5667033b6d84f4975ccc01d23b96',
      params: {
        steps: 26,
        guidance: 3.5,
        output_format: 'webp',
        output_quality: 80,
        go_fast: true
      },
      supportsLora: true,
      costTier: 'premium'
    };
  }
  return stylesConfig.models[model] || stylesConfig.models['flux-schnell'];
}

/**
 * Get negative prompt for style and model
 */
export function getNegativePrompt(style: ArtStyle, model: 'flux-dev-lora' | 'flux-schnell' | 'sdxl'): string {
  // Flux models (including flux-dev-lora) use minimal negative prompts
  if (model === 'flux-dev-lora' || model === 'flux-schnell') {
    return "text, watermark, signature, logo, extra fingers, distorted hands, disfigured faces, multiple heads, heavy photo-bokeh, harsh HDR, neon glow, plastic skin";
  }
  
  const negatives = (stylesConfig as any).negativePrompts;
  if (!negatives) return "";
  
  const styleKey = style.toLowerCase();
  return negatives.sdxl?.[styleKey] || "";
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
 * Get routing reason for logging (flux-dev-lora primary)
 */
export function getRoutingReason(style: ArtStyle, peopleCount: number, peopleCloseUp: boolean, job: ModelJob): string {
  if (job.model === 'flux-dev-lora') {
    return `Primary model: Flux-Dev with ${style} LoRA for optimal quality and consistency`;
  }
  
  if (job.model === 'flux-schnell') {
    return `Fallback: Flux-Schnell for ${style} (flux-dev-lora unavailable)`;
  }
  
  if (job.model === 'sdxl') {
    return `Fallback: SDXL${job.useLora ? '+LoRA' : ''} for ${style} (flux models unavailable)`;
  }
  
  return `${style} → ${(job.model as string).toUpperCase()}`;
}

/**
 * Legacy routing reason for backward compatibility
 */
export function getRoutingReasonLegacy(style: ArtStyle, hasPeople: boolean, job: ModelJob): string {
  const peopleCount = hasPeople ? 1 : 0;
  const peopleCloseUp = false;
  return getRoutingReason(style, peopleCount, peopleCloseUp, job);
}