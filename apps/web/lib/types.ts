// Import and re-export types from shared package
export type { PreviewResult, UserIdentity, PrintSize, Address, Aspect } from '@taletoprint/shared';
export { ImageOrientation } from '@taletoprint/shared';

// Import Aspect type directly for use in PromptBundle
import type { Aspect } from '@taletoprint/shared';

// Art style enum - matches new prompt builder
export enum ArtStyle {
  WATERCOLOUR = 'watercolour',
  OIL_PAINTING = 'oil_painting',
  PASTEL = 'pastel',
  PENCIL_INK = 'pencil_ink',
  STORYBOOK = 'storybook',
  IMPRESSIONIST = 'impressionist'
}

export type PromptBundle = {
  positive: string;
  negative: string;
  params: {
    width: number;
    height: number;
    steps: number;
    cfg: number;
    sampler: string;
    seed: number;
    denoise?: number;
  };
  meta: {
    mainSubject: string;
    setting: string;
    mood: string;
    paletteHint: string;
    style: ArtStyle;
    aspect: Aspect;
    styleKeywords?: string[];
  };
};