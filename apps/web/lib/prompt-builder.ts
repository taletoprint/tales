import { ArtStyle, Aspect, PromptBundle } from './types';

/** Minimal heuristic parser for a 500-char memory string */
function parseMemory(memory: string) {
  // Normalise whitespace and lowercase helper
  const raw = memory.trim().replace(/\s+/g, " ");
  const lc = raw.toLowerCase();

  // People detection
  const peopleKeywords = [
    'people', 'person', 'family', 'mother', 'father', 'parent', 'child', 'children',
    'grandma', 'grandpa', 'grandmother', 'grandfather', 'mum', 'dad', 'mom',
    'sister', 'brother', 'uncle', 'aunt', 'cousin', 'friend', 'friends',
    'we ', 'us ', 'our ', 'i ', 'my ', 'me ', 'myself',
    'face', 'faces', 'hands', 'smile', 'smiling', 'laughing', 'crying',
    'silhouette', 'silhouettes', 'crowd', 'group', 'together',
    'human', 'humans', 'man', 'woman', 'boy', 'girl', 'baby',
    'wedding', 'birthday', 'anniversary', 'celebration',
    'gran', 'bike', 'bicycle', 'cycling', 'bake', 'kitchen'
  ];

  const animalOnlyKeywords = ['cat', 'dog', 'bird', 'pet'];
  const objectKeywords = ['flower', 'tree', 'building', 'house', 'landscape', 'garden'];

  const hasPeopleKeywords = peopleKeywords.some(keyword => lc.includes(keyword));
  const hasOnlyAnimals = animalOnlyKeywords.some(keyword => lc.includes(keyword)) && !hasPeopleKeywords;
  const hasOnlyObjects = objectKeywords.some(keyword => lc.includes(keyword)) && !hasPeopleKeywords;

  // Default to SDXL unless we're confident there are people
  const has_people = hasOnlyAnimals || hasOnlyObjects ? false : hasPeopleKeywords;

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
  let mainSubject = has_people ? "two people sharing a meaningful moment" : "a beautiful scene";
  if (/(gran|grandma|grandmother)/.test(lc)) mainSubject = "a grandparent and child together";
  if (/(mum|mother|mom)/.test(lc)) mainSubject = "a mother and child smiling together";
  if (/(dad|father)/.test(lc)) mainSubject = "a father and child sharing a moment";
  if (/(dog|cat|pet|spaniel|labrador)/.test(lc)) {
    mainSubject = has_people ? "a beloved family pet with their person" : "a beloved family pet";
  }
  if (/(bike|bicycle|cycling)/.test(lc)) mainSubject = "two people cycling together";
  if (/(bake|kitchen|cinnamon|tea|cake|bread)/.test(lc)) mainSubject = "family baking together";
  if (/(sunflower|rose|flowers)/.test(lc)) {
    mainSubject = has_people ? "a person with a tall sunflower in bloom" : "tall sunflowers in bloom";
  }
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

  return { mainSubject, setting, mood, paletteHint, has_people, raw };
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

/** Style presets: Dual templates optimized for people (Flux) vs non-people (SDXL) */
function stylePreset(style: ArtStyle, has_people: boolean = true) {
  // People-optimized templates (Flux) - focus on anatomy, expressions, clear faces
  const peoplePresets = {
    [ArtStyle.WATERCOLOUR]: {
      styleLock: "Soft watercolour painting, gentle translucent washes, clear facial features, natural skin tones, fluid brushstrokes, airy highlights, accurate proportions, warm expressions, serene mood",
      steps: 4, cfg: 0.0, sampler: "flux", negatives: ""
    },
    [ArtStyle.OIL_PAINTING]: {
      styleLock: "Traditional oil painting, rich brushstrokes, warm skin tones, clear facial features, soft lighting, natural proportions, expressive poses, classic fine-art atmosphere with lifelike details",
      steps: 4, cfg: 0.0, sampler: "flux", negatives: ""
    },
    [ArtStyle.PASTEL]: {
      styleLock: "Soft chalk pastel artwork, gentle powdery tones, natural skin texture, warm expressions, soft blending, nostalgic atmosphere, clear proportions, hand-drawn feel with friendly faces",
      steps: 4, cfg: 0.0, sampler: "flux", negatives: ""
    },
    [ArtStyle.PENCIL_INK]: {
      styleLock: "Hand-drawn pencil and ink sketch, fine linework, clear facial features, expressive eyes, soft graphite shading, natural proportions, classic portrait style, detailed faces with emotional depth",
      steps: 4, cfg: 0.0, sampler: "flux", negatives: ""
    },
    [ArtStyle.STORYBOOK]: {
      styleLock: "Whimsical storybook illustration, friendly characters, warm expressions, clear friendly faces, soft linework, gentle colours, cosy atmosphere, children's picture-book style with inviting personalities",
      steps: 4, cfg: 0.0, sampler: "flux", negatives: ""
    },
    [ArtStyle.IMPRESSIONIST]: {
      styleLock: "Impressionist painting, soft brushstrokes, natural light on faces, warm skin tones, focus on human emotion and expression, gentle movement, light effects highlighting facial features",
      steps: 4, cfg: 0.0, sampler: "flux", negatives: ""
    }
  };

  // Non-people templates (SDXL) - focus on medium texture, artistic authenticity
  const nonPeoplePresets = {
    [ArtStyle.WATERCOLOUR]: {
      styleLock: "Authentic watercolour painting, heavy bleeding edges, visible paper grain, uneven pigment pools, raw watercolour texture, granulation, authentic painting artifacts, traditional medium feel",
      steps: 30, cfg: 7.5, sampler: "DPMSolverMultistep", negatives: "blurry, low quality, distorted, artificial"
    },
    [ArtStyle.OIL_PAINTING]: {
      styleLock: "Traditional oil painting, heavy impasto texture, visible canvas weave, layered paint buildup, authentic brushstroke marks, paint cracks, gallery lighting, rich pigment texture with classical depth",
      steps: 30, cfg: 7.5, sampler: "DPMSolverMultistep", negatives: "smooth, digital, plastic, fake texture"
    },
    [ArtStyle.PASTEL]: {
      styleLock: "Chalk pastel artwork, heavy chalk dust, powdery smudges, rough paper texture, uneven coverage, finger-blended areas, authentic pastel feel, dusty medium artifacts with textured paper grain",
      steps: 30, cfg: 7.5, sampler: "DPMSolverMultistep", negatives: "smooth, clean, digital, perfect"
    },
    [ArtStyle.PENCIL_INK]: {
      styleLock: "Hand-drawn pencil and ink sketch, heavy cross-hatching, visible pen strokes, ink bleed on paper, uneven line weights, sketchbook texture, authentic drawing feel, raw sketching marks with paper grain",
      steps: 30, cfg: 7.5, sampler: "DPMSolverMultistep", negatives: "perfect lines, digital, vector art"
    },
    [ArtStyle.STORYBOOK]: {
      styleLock: "Traditional storybook illustration, flat colour washes, visible brush texture, printed book feel, classic illustration style with authentic medium artifacts, traditional children's book aesthetic",
      steps: 30, cfg: 7.5, sampler: "DPMSolverMultistep", negatives: "3D rendered, photorealistic, modern digital"
    },
    [ArtStyle.IMPRESSIONIST]: {
      styleLock: "Authentic impressionist painting, heavy visible brushstrokes, broken colour technique, paint texture, raw impressionist style with authentic painting marks, traditional plein air feel with bold brushwork",
      steps: 30, cfg: 7.5, sampler: "DPMSolverMultistep", negatives: "smooth, detailed, photographic, clean"
    }
  };

  const presets = has_people ? peoplePresets : nonPeoplePresets;
  return presets[style];
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
  const preset = stylePreset(style, parsed.has_people);
  const size = aspectToSize(aspect);
  const wrapper = getUniversalWrapper();

  const positive =
    `${wrapper.prefix} ` +
    `${preset.styleLock} of ${parsed.mainSubject} in ${parsed.setting}. ` +
    `Mood: ${parsed.mood}. Colour palette: ${parsed.paletteHint}. ` +
    `Balanced composition for framed wall art, clear focal point. ` +
    `${wrapper.suffix}`;

  const negative = preset.negatives; // Empty for Flux, populated for SDXL

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
      has_people: parsed.has_people,
    },
  };
}