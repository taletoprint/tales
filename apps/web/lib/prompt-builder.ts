import { ArtStyle, Aspect, PromptBundle } from './types';

/** Minimal heuristic parser for a 500-char memory string */
function parseMemory(memory: string) {
  // Normalise whitespace and lowercase helper
  const raw = memory.trim().replace(/\s+/g, " ");
  const lc = raw.toLowerCase();

  // Mood cues
  const mood =
    /(warm|cosy|cozy|happy|joy|sunny|golden|peaceful|calm|quiet|nostalg|love|tender)/.test(lc)
      ? "warm, nostalgic, peaceful"
      : /(rain|storm|winter|cold|grey|gray)/.test(lc)
      ? "calm, reflective"
      : "gentle, uplifting";

  // Setting cues
  let setting = "a homely interior with natural light";
  if (/(garden|yard|allotment|park|field|meadow|dales|forest|beach|seaside)/.test(lc))
    setting = "a leafy outdoor setting with soft natural light";
  if (/(kitchen|dining|living room|lounge|fireplace|hearth)/.test(lc))
    setting = "a cosy kitchen/living space with warm light";
  if (/(church|cathedral|station|bridge|cottage|terrace|house|home)/.test(lc))
    setting = "a charming British street or home exterior";
  if (/(snow|christmas|xmas)/.test(lc))
    setting = "a festive winter scene with subtle seasonal details";

  // Subject cues (very light touch)
  let mainSubject = "two people sharing a meaningful moment";
  if (/(gran|grandma|grandmother)/.test(lc)) mainSubject = "a grandparent and child together";
  if (/(mum|mother|mom)/.test(lc)) mainSubject = "a mother and child smiling together";
  if (/(dad|father)/.test(lc)) mainSubject = "a father and child sharing a moment";
  if (/(dog|cat|pet|spaniel|labrador)/.test(lc)) mainSubject = "a beloved family pet with their person";
  if (/(bike|bicycle|cycling)/.test(lc)) mainSubject = "two people cycling together";
  if (/(bake|kitchen|cinnamon|tea|cake|bread)/.test(lc)) mainSubject = "family baking together";
  if (/(sunflower|rose|flowers)/.test(lc)) mainSubject = "a person with a tall sunflower in bloom";
  if (/(wedding|anniversary)/.test(lc)) mainSubject = "a couple celebrating an anniversary";

  // Palette hint
  const paletteHint =
    /(autumn|fall)/.test(lc)
      ? "autumnal palette of russet, ochre, sage"
      : /(winter|snow|frost)/.test(lc)
      ? "cool winter palette of soft blues and creams"
      : /(spring|blossom)/.test(lc)
      ? "spring palette of fresh greens and pastel pinks"
      : "warm neutrals with gentle terracotta accents";

  return { mainSubject, setting, mood, paletteHint, raw };
}

/** Map product aspect → working pixel size for SDXL - Real-ESRGAN compatible */
function aspectToSize(aspect: Aspect): { width: number; height: number } {
  // Real-ESRGAN max: ~2M pixels (1448×1448 = 2,096,704 pixels)
  // A3 ratio: 297×420mm = 0.707 aspect ratio
  switch (aspect) {
    case "A3_portrait": // 297x420 ratio - fits in Real-ESRGAN limits
      return { width: 1024, height: 1448 }; // A3 portrait - 1,482,752 pixels (safe)
    case "A3_landscape":
      return { width: 1448, height: 1024 }; // A3 landscape - 1,482,752 pixels (safe)
    case "A2_portrait": // larger preview
      return { width: 1024, height: 1448 }; // Same as A3 portrait for now
    case "square":
    default:
      return { width: 1024, height: 1024 }; // Square - 1,048,576 pixels (safe)
  }
}

/** Style presets: wording + SDXL params to keep styles distinct */
function stylePreset(style: ArtStyle) {
  switch (style) {
    case ArtStyle.WATERCOLOUR:
      return {
        styleLock:
          "soft watercolour painting, gentle washes, subtle granulation, light pencil underdrawing, airy negative space, museum-quality, no harsh outlines",
        steps: 30,
        cfg: 6.8,
        sampler: "DPMSolverMultistep",
        negatives:
          "text, watermark, logo, extra limbs, disfigured, oversaturated colours, harsh outlines, photographic lens effects",
      };
    case ArtStyle.OIL_PAINTING:
      return {
        styleLock:
          "rich oil painting, visible brush strokes, warm golden hour light, layered impasto texture, classic fine art composition",
        steps: 28,
        cfg: 6.2,
        sampler: "K_EULER",
        negatives:
          "text, watermark, logo, plastic sheen, anime, cartoony, lens distortion, extra digits, low detail",
      };
    case ArtStyle.PASTEL:
      return {
        styleLock:
          "soft pastel artwork, chalky texture, muted tones, gentle blending, paper tooth visible, cosy and comforting aesthetic",
        steps: 30,
        cfg: 7.0,
        sampler: "DPMSolverMultistep",
        negatives:
          "text, watermark, logo, high contrast extremes, neon colours, glossy surfaces, hard outlines",
      };
    case ArtStyle.PENCIL_INK:
      return {
        styleLock:
          "fine pencil and ink drawing, delicate linework, light cross-hatching, subtle watercolour tint, sketchbook elegance, clear focal point",
        steps: 32,
        cfg: 7.6,
        sampler: "DPMSolverMultistep",
        negatives:
          "text, watermark, logo, heavy shading blotches, smudging artefacts, comic halftone dots, warped anatomy",
      };
    case ArtStyle.STORYBOOK:
      return {
        styleLock:
          "charming storybook illustration, whimsical children's book art, warm and inviting, soft textures, gentle narrative quality, enchanting atmosphere",
        steps: 28,
        cfg: 6.5,
        sampler: "DPMSolverMultistep",
        negatives:
          "text, watermark, logo, scary imagery, dark themes, harsh shadows, photorealistic, anime style, 3D rendering",
      };
    case ArtStyle.IMPRESSIONIST:
      return {
        styleLock:
          "impressionist painting, loose expressive brushwork, luminous colour, dappled light, inspired by Monet and Renoir, harmonious palette",
        steps: 28,
        cfg: 6.0,
        sampler: "DPMSolverMultistep",
        negatives:
          "text, watermark, logo, photo-real lens effects, hard outlines, muddy colour mixing, posterisation",
      };
  }
}

function seeded(style: ArtStyle): number {
  // Generate random seed for varied outputs
  // Each generation should produce different results
  return Math.floor(Math.random() * 1000000) + Date.now();
}

/** Main builder */
export function buildPrompt(
  userMemory: string,
  style: ArtStyle,
  aspect: Aspect
): PromptBundle {
  const parsed = parseMemory(userMemory);
  const preset = stylePreset(style);
  const size = aspectToSize(aspect);

  const positive =
    `${preset.styleLock}. ` +
    `A tasteful scene of ${parsed.mainSubject} in ${parsed.setting}. ` +
    `Mood: ${parsed.mood}. Colour palette: ${parsed.paletteHint}. ` +
    `Balanced composition for framed wall art, clear focal point, clean edges for print bleed.`;

  const negative =
    preset.negatives +
    ", multiple faces duplicated, distorted perspective, cluttered background, noisy textures, text overlays";

  return {
    positive,
    negative,
    params: {
      width: size.width,
      height: size.height,
      steps: preset.steps,
      cfg: preset.cfg,
      sampler: preset.sampler,
      seed: seeded(style),
    },
    meta: {
      mainSubject: parsed.mainSubject,
      setting: parsed.setting,
      mood: parsed.mood,
      paletteHint: parsed.paletteHint,
      style,
      aspect,
    },
  };
}