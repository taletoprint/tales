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

/** Universal wrapper for Flux-Schnell prompts */
function getUniversalWrapper() {
  return {
    prefix: "High-quality illustration, coherent composition, accurate proportions, gentle lighting.",
    suffix: "Clean lines, pleasing colour harmony, no text, no watermark."
  };
}

/** Style presets: Flux-optimized templates with positive descriptors only */
function stylePreset(style: ArtStyle) {
  switch (style) {
    case ArtStyle.WATERCOLOUR:
      return {
        styleLock:
          "Delicate watercolour painting, translucent washes, soft edges, light granulation on textured paper, airy highlights, natural colours, gentle flow, serene atmosphere, faces softly defined, proportions consistent",
        steps: 4, // Flux-Schnell optimized
        cfg: 0.0, // Flux doesn't use guidance scale
        sampler: "flux", // Placeholder for Flux
        negatives: "", // Flux doesn't use negative prompts effectively
      };
    case ArtStyle.OIL_PAINTING:
      return {
        styleLock:
          "Classic oil painting, textured brushstrokes, layered paint, rich mid-tones, controlled highlights and shadow, warm gallery feel, natural skin tones, clear faces, balanced composition",
        steps: 4,
        cfg: 0.0,
        sampler: "flux",
        negatives: "",
      };
    case ArtStyle.PASTEL:
      return {
        styleLock:
          "Soft pastel illustration, muted airy palette (soft pinks, blues, greens), smooth shading, hand-drawn feel, calm dreamy mood, faces clear and natural, proportions consistent, gentle expressions",
        steps: 4,
        cfg: 0.0,
        sampler: "flux",
        negatives: "",
      };
    case ArtStyle.PENCIL_INK:
      return {
        styleLock:
          "Minimalist line art, clean black ink lines, generous white space, simplified forms, subtle muted accent colour (optional), elegant modern composition, clear silhouette, balanced negative space",
        steps: 4,
        cfg: 0.0,
        sampler: "flux",
        negatives: "",
      };
    case ArtStyle.STORYBOOK:
      return {
        styleLock:
          "Whimsical storybook illustration, warm inviting palette, soft linework, simplified shapes, friendly expressions, gentle motion, clear character focus, readable scene, cosy atmosphere",
        steps: 4,
        cfg: 0.0,
        sampler: "flux",
        negatives: "",
      };
    case ArtStyle.IMPRESSIONIST:
      return {
        styleLock:
          "Hand-drawn pencil sketch, fine cross-hatching, soft graphite shading, subtle paper texture, gentle contrast, natural expressions, accurate proportions, classic sketchbook feel",
        steps: 4,
        cfg: 0.0,
        sampler: "flux",
        negatives: "",
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
  const wrapper = getUniversalWrapper();

  const positive =
    `${wrapper.prefix} ` +
    `${preset.styleLock} of ${parsed.mainSubject} in ${parsed.setting}. ` +
    `Mood: ${parsed.mood}. Colour palette: ${parsed.paletteHint}. ` +
    `Balanced composition for framed wall art, clear focal point. ` +
    `${wrapper.suffix}`;

  const negative = preset.negatives; // Empty for Flux

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