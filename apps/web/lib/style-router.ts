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
 * Choose the best model and LoRA configuration for a given style and content
 */
export function chooseModelJob(style: ArtStyle, hasPeople: boolean): ModelJob {
  const styleKey = style.toLowerCase();
  const styleConfig = stylesConfig.styles[styleKey as keyof typeof stylesConfig.styles];
  
  if (!styleConfig) {
    return { model: 'sdxl', useLora: false };
  }

  // Check for people-based routing
  if ('ifPeople' in styleConfig || 'ifNoPeople' in styleConfig) {
    const choice = hasPeople ? styleConfig.ifPeople : styleConfig.ifNoPeople;
    if (choice) {
      return choice;
    }
  }

  // Use primary choice
  if (styleConfig.primary) {
    return styleConfig.primary;
  }

  // Fall back to first fallback
  if (styleConfig.fallbacks && styleConfig.fallbacks.length > 0) {
    return styleConfig.fallbacks[0];
  }

  return { model: 'sdxl', useLora: false };
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
 * Get routing reason for logging
 */
export function getRoutingReason(style: ArtStyle, hasPeople: boolean, job: ModelJob): string {
  const styleKey = style.toLowerCase();
  
  if (['impressionist', 'oil_painting'].includes(styleKey)) {
    return `${style} style needs texture → ${job.model.toUpperCase()}`;
  }
  
  if (['watercolour', 'pastel'].includes(styleKey)) {
    if (hasPeople && job.model === 'flux-schnell') {
      return `${style} with people → Flux for faces`;
    }
    if (!hasPeople && job.model === 'sdxl') {
      return `${style} without people → SDXL for texture`;
    }
  }
  
  if (hasPeople && job.model === 'flux-schnell') {
    return `people detected → Flux for faces`;
  }
  
  return `style optimization → ${job.model.toUpperCase()}`;
}