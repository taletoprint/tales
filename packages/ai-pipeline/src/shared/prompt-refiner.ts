import OpenAI from 'openai';

export type ArtStyle = 'WATERCOLOUR' | 'OIL_PAINTING' | 'PASTEL' | 'PENCIL_INK' | 'STORYBOOK' | 'IMPRESSIONIST';

export interface PromptRefinementRequest {
  story: string;
  style: ArtStyle;
}

export interface PromptRefinementResult {
  model: string;
  style: string;
  lora: {
    id: string;
    scale: number;
  };
  positive_prompt: string;
  negative_prompt: string;
  parameters: {
    num_inference_steps: number;
    guidance_scale: number;
    width: number;
    height: number;
    seed: number | null;
  };
  safety: {
    people_closeup: 'avoid' | 'allow';
    ethnicity_handling: 'non_specific_unless_explicit';
    nsfw: 'forbid';
  };
  notes: string;
  // Legacy fields for compatibility
  refined_prompt?: string;
  style_keywords?: string[];
  has_people?: boolean;
  people_count?: number;
  people_close_up?: boolean;
  people_rendering?: 'none' | 'implied' | 'distant' | 'close_up';
}

export class PromptRefiner {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async refinePrompt(request: PromptRefinementRequest, dimensions?: {width: number, height: number}): Promise<PromptRefinementResult> {
    const defaultDimensions = dimensions || { width: 1024, height: 1024 };
    
    const systemPrompt = `You are the "TaleToPrint Refiner". Your job is to convert a short customer "tale" into a precise, style-aware image brief for an AI image model.

Rules:
- British English.
- Preserve ALL human elements and relationships in the tale (do not remove people).
- Never invent personal attributes (names, ages, races/ethnicities, religions) unless explicitly given.
- If ethnicity is not specified, DO NOT infer it. Use neutral, non-specific depiction (lightly stylised faces, no close-up facial detail unless requested).
- Lean into composition, colour, lighting, mood, background detail, props, and environment.
- Keep text-to-image friendly: concrete nouns, verbs, visual adjectives; avoid plot logic.
- Respect the selected art style and translate it into clear medium cues (brushwork, texture, materials).
- Safe, respectful, non-stereotyped depictions only.

Output strictly as compact JSON (no markdown) matching the schema.

Schema:
{
  "model": "flux-dev-lora",
  "style": "watercolour|oil_painting|pastel|pencil_ink|storybook|impressionist",
  "lora": { "id": "string", "scale": 1.0 },
  "positive_prompt": "string",
  "negative_prompt": "string",
  "parameters": {
    "num_inference_steps": 25,
    "guidance_scale": 3.5,
    "width": ${defaultDimensions.width},
    "height": ${defaultDimensions.height},
    "seed": "number | null"
  },
  "safety": {
    "people_closeup": "avoid|allow",
    "ethnicity_handling": "non_specific_unless_explicit",
    "nsfw": "forbid"
  },
  "notes": "string"  // brief rationale for debugging
}

Style translation (append to the user brief as appropriate):
- watercolour: "delicate watercolour, soft flowing washes, gentle bleeding edges, textured cotton paper, granulation"
- oil_painting: "rich oil on canvas, visible brush strokes, impasto texture, layered glazing, warm natural palette"
- pastel: "soft chalk pastel, dusty texture, muted tones, visible pastel strokes on toned paper"
- pencil_ink: "fine pencil and ink linework, cross-hatching, hand-drawn contour lines, minimal wash, sketchbook feel"
- storybook: "whimsical picture-book illustration, playful shapes, simplified forms, warm palette, gentle vignetting"
- impressionist: "classic impressionist brushwork, broken colour, dappled light, atmospheric perspective, suggestion over detail"

Ethnicity & faces:
- If ethnicity unspecified → "non-specific features, lightly stylised faces, medium distance composition". Do not specify skin colour or ethnicity.
- If explicitly stated by the user, reflect it respectfully and literally.
- Prefer compositions that convey the scene without extreme facial close-ups unless requested.

Negative prompt defaults:
"text, watermark, signature, logo, extra fingers, distorted hands, disfigured faces, multiple heads, heavy photo-bokeh, harsh HDR, neon glow, plastic skin"`;

    const userPrompt = `Tale: "${request.story}"

Style: ${request.style.toLowerCase()}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const result = JSON.parse(content) as PromptRefinementResult;
      
      // Add legacy fields for backward compatibility
      result.refined_prompt = result.positive_prompt;
      result.style_keywords = this.extractStyleKeywords(result.positive_prompt, request.style);
      result.has_people = result.safety.people_closeup === 'allow';
      result.people_count = result.has_people ? 1 : 0;
      result.people_close_up = result.safety.people_closeup === 'allow';
      result.people_rendering = result.has_people ? 'close_up' : 'none';

      return result;
    } catch (error: any) {
      console.error('Error refining prompt:', error);
      
      // Check if it's a quota error
      if (error.code === 'insufficient_quota') {
        console.warn('OpenAI quota exceeded - using fallback prompt generation');
      }
      
      // Fallback to basic prompt generation
      return this.createFallbackPrompt(request);
    }
  }

  private getUniversalWrapper() {
    return {
      prefix: "High-quality illustration, coherent composition, accurate proportions, gentle lighting.",
      suffix: "Clean lines, pleasing colour harmony, no text, no watermark."
    };
  }

  private getStylePrompt(style: ArtStyle, has_people: boolean = true) {
    // People-optimized templates (Flux) - focus on anatomy, expressions, clear faces
    const peopleTemplates = {
      WATERCOLOUR: {
        template: `Soft watercolour painting of [main subject/action] in [setting].
Gentle translucent washes, clear facial features, natural skin tones.
Fluid brushstrokes, airy highlights, accurate proportions.
Warm expressions, serene mood, soft paper texture.`,
        keywords: ['watercolour', 'translucent washes', 'gentle', 'natural skin tones', 'expressions']
      },
      OIL_PAINTING: {
        template: `Traditional oil painting of [main subject/action] in [setting].
Rich brushstrokes, warm skin tones, clear facial features.
Soft lighting, natural proportions, expressive poses.
Classic fine-art atmosphere with lifelike details.`,
        keywords: ['oil painting', 'warm skin tones', 'clear features', 'expressive', 'lifelike']
      },
      PASTEL: {
        template: `Soft chalk pastel artwork of [main subject/action] in [setting].
Gentle powdery tones, natural skin texture, warm expressions.
Soft blending, nostalgic atmosphere, clear proportions.
Hand-drawn feel with friendly faces and poses.`,
        keywords: ['chalk pastel', 'gentle tones', 'warm expressions', 'friendly', 'nostalgic']
      },
      PENCIL_INK: {
        template: `Hand-drawn pencil and ink sketch of [main subject/action] in [setting].
Fine linework, clear facial features, expressive eyes.
Soft graphite shading, natural proportions, classic portrait style.
Detailed faces with emotional depth, monochrome elegance.`,
        keywords: ['pencil ink', 'clear features', 'expressive eyes', 'portrait style', 'emotional']
      },
      STORYBOOK: {
        template: `Whimsical storybook illustration of [main subject/action] in [setting].
Friendly characters, warm expressions, clear friendly faces.
Soft linework, gentle colours, cosy atmosphere.
Children's picture-book style with inviting personalities.`,
        keywords: ['storybook', 'friendly characters', 'warm expressions', 'inviting', 'personalities']
      },
      IMPRESSIONIST: {
        template: `Impressionist painting of [main subject/action] in [setting].
Soft brushstrokes, natural light on faces, warm skin tones.
Focus on human emotion and expression, gentle movement.
Light effects highlighting facial features and gestures.`,
        keywords: ['impressionist', 'natural light', 'warm skin', 'emotion', 'facial features']
      }
    };

    // Non-people templates (SDXL) - focus on medium texture, artistic authenticity
    const nonPeopleTemplates = {
      WATERCOLOUR: {
        template: `Authentic watercolour painting of [main subject/action] in [setting].
Heavy bleeding edges, visible paper grain, uneven pigment pools.
Raw watercolour texture, granulation, authentic painting artifacts.
Traditional medium feel with organic colour flow.`,
        keywords: ['watercolour', 'bleeding edges', 'paper grain', 'granulation', 'authentic']
      },
      OIL_PAINTING: {
        template: `Traditional oil painting of [main subject/action] in [setting].
Heavy impasto texture, visible canvas weave, layered paint buildup.
Authentic brushstroke marks, paint cracks, gallery lighting.
Rich pigment texture with classical painting depth.`,
        keywords: ['oil painting', 'impasto texture', 'canvas weave', 'paint cracks', 'classical']
      },
      PASTEL: {
        template: `Chalk pastel artwork of [main subject/action] in [setting].
Heavy chalk dust, powdery smudges, rough paper texture.
Uneven coverage, finger-blended areas, authentic pastel feel.
Dusty medium artifacts with textured paper grain.`,
        keywords: ['chalk pastel', 'chalk dust', 'rough texture', 'finger-blended', 'dusty']
      },
      PENCIL_INK: {
        template: `Hand-drawn pencil and ink sketch of [main subject/action] in [setting].
Heavy cross-hatching, visible pen strokes, ink bleed on paper.
Uneven line weights, sketchbook texture, authentic drawing feel.
Raw sketching marks with paper grain and ink artifacts.`,
        keywords: ['pencil ink', 'cross-hatching', 'ink bleed', 'uneven lines', 'sketching marks']
      },
      STORYBOOK: {
        template: `Traditional storybook illustration of [main subject/action] in [setting].
Flat colour washes, visible brush texture, printed book feel.
Classic illustration style with authentic medium artifacts.
Traditional children's book aesthetic with painting texture.`,
        keywords: ['storybook', 'flat washes', 'brush texture', 'printed book', 'traditional']
      },
      IMPRESSIONIST: {
        template: `Authentic impressionist painting of [main subject/action] in [setting].
Heavy visible brushstrokes, broken colour technique, paint texture.
Raw impressionist style with authentic painting marks.
Traditional plein air feel with bold brushwork.`,
        keywords: ['impressionist', 'visible brushstrokes', 'broken colour', 'paint texture', 'plein air']
      }
    };

    const templates = has_people ? peopleTemplates : nonPeopleTemplates;
    return templates[style];
  }

  private createFallbackPrompt(request: PromptRefinementRequest): PromptRefinementResult {
    const peopleAnalysis = this.analyzeStoryForPeople(request.story, request.style);
    const loraMapping = this.getLoRAMapping(request.style);
    const styleTranslation = this.getStyleTranslation(request.style);
    
    const positivePrompt = `A beautiful artistic scene inspired by: ${request.story}. ${styleTranslation}`;
    
    return {
      model: "flux-dev-lora",
      style: request.style.toLowerCase(),
      lora: loraMapping,
      positive_prompt: positivePrompt,
      negative_prompt: "text, watermark, signature, logo, extra fingers, distorted hands, disfigured faces, multiple heads, heavy photo-bokeh, harsh HDR, neon glow, plastic skin",
      parameters: {
        num_inference_steps: 25,
        guidance_scale: 3.5,
        width: 1024,
        height: 1024,
        seed: null
      },
      safety: {
        people_closeup: peopleAnalysis.people_close_up ? 'allow' : 'avoid',
        ethnicity_handling: 'non_specific_unless_explicit',
        nsfw: 'forbid'
      },
      notes: "Fallback prompt generation used due to OpenAI API failure",
      // Legacy fields
      refined_prompt: positivePrompt,
      style_keywords: [request.style.toLowerCase(), 'artistic', 'authentic', 'texture', 'traditional'],
      has_people: peopleAnalysis.has_people,
      people_count: peopleAnalysis.people_count,
      people_close_up: peopleAnalysis.people_close_up,
      people_rendering: peopleAnalysis.people_rendering
    };
  }

  private extractJsonFromResponse(content: string): string {
    // Handle responses wrapped in markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return jsonMatch[1];
    }
    
    // If no code blocks, try to find JSON object directly
    const directJsonMatch = content.match(/\{[\s\S]*\}/);
    if (directJsonMatch) {
      return directJsonMatch[0];
    }
    
    // Fallback: assume the entire content is JSON
    return content.trim();
  }

  private analyzeStoryForPeople(story: string, style: ArtStyle) {
    const lowerStory = story.toLowerCase();
    
    // People keywords - explicit mentions
    const singlePersonKeywords = ['i ', 'me ', 'my ', 'myself', 'person'];
    const multiplePersonKeywords = [
      'family', 'we ', 'us ', 'our ', 'people', 'crowd', 'group', 'together',
      'friends', 'children', 'wedding', 'birthday', 'celebration',
      'gathered', 'around table', 'around the table', 'carving', 'cooking together',
      'family dinner', 'family meal', 'everyone', 'all of us', 'family gathering'
    ];
    const anyPersonKeywords = [
      'mother', 'father', 'parent', 'child', 'grandma', 'grandpa', 'mum', 'dad', 'mom',
      'sister', 'brother', 'uncle', 'aunt', 'cousin', 'friend',
      'face', 'faces', 'hands', 'smile', 'smiling', 'laughing', 'crying',
      'silhouette', 'silhouettes', 'human', 'humans', 'man', 'woman', 'boy', 'girl', 'baby'
    ];
    
    // Close-up keywords suggest faces are main subject
    const closeUpKeywords = ['portrait', 'face', 'expression', 'smile', 'eyes', 'looking'];
    
    // Count people mentions
    let people_count = 0;
    const hasSingle = singlePersonKeywords.some(keyword => lowerStory.includes(keyword));
    const hasMultiple = multiplePersonKeywords.some(keyword => lowerStory.includes(keyword));
    const hasAny = anyPersonKeywords.some(keyword => lowerStory.includes(keyword));
    const hasCloseUp = closeUpKeywords.some(keyword => lowerStory.includes(keyword));
    
    if (hasMultiple) {
      people_count = 3; // Assume multiple people
    } else if (hasSingle || hasAny) {
      people_count = 1;
    }
    
    // Animals-only or objects-only suggest no people
    const animalOnlyKeywords = ['cat', 'dog', 'bird', 'pet'];
    const objectKeywords = ['flower', 'tree', 'building', 'house', 'landscape', 'garden'];
    const hasOnlyAnimals = animalOnlyKeywords.some(keyword => lowerStory.includes(keyword)) && !hasAny && !hasSingle;
    const hasOnlyObjects = objectKeywords.some(keyword => lowerStory.includes(keyword)) && !hasAny && !hasSingle;
    
    if (hasOnlyAnimals || hasOnlyObjects) {
      people_count = 0;
    }
    
    // Determine rendering approach
    let people_rendering: 'none' | 'implied' | 'distant' | 'close_up' = 'none';
    if (people_count === 0) {
      people_rendering = 'none';
    } else if (hasCloseUp || people_count >= 3) {
      people_rendering = 'close_up';
    } else if (people_count === 1) {
      people_rendering = 'implied'; // Try to minimize via artifacts/silhouettes
    } else {
      people_rendering = 'distant';
    }
    
    return {
      has_people: people_count > 0,
      people_count,
      people_close_up: hasCloseUp || people_count >= 3,
      people_rendering
    };
  }

  private detectPeopleInStory(story: string, style: ArtStyle): boolean {
    // Legacy method for compatibility
    const analysis = this.analyzeStoryForPeople(story, style);
    return analysis.has_people;
  }

  private getLoRAMapping(style: ArtStyle): { id: string; scale: number } {
    const mappings = {
      'WATERCOLOUR': { id: 'lora_watercolour_v2', scale: 1.0 },
      'OIL_PAINTING': { id: 'lora_oil_v3', scale: 1.0 },
      'PASTEL': { id: 'lora_pastel_v2', scale: 1.0 },
      'PENCIL_INK': { id: 'lora_ink_v1', scale: 0.9 },
      'STORYBOOK': { id: 'lora_storybook_v3', scale: 1.1 },
      'IMPRESSIONIST': { id: 'lora_impressionist_v2', scale: 1.0 }
    };
    return mappings[style] || { id: 'lora_watercolour_v2', scale: 1.0 };
  }

  private getStyleTranslation(style: ArtStyle): string {
    const translations = {
      'WATERCOLOUR': 'delicate watercolour, soft flowing washes, gentle bleeding edges, textured cotton paper, granulation',
      'OIL_PAINTING': 'rich oil on canvas, visible brush strokes, impasto texture, layered glazing, warm natural palette',
      'PASTEL': 'soft chalk pastel, dusty texture, muted tones, visible pastel strokes on toned paper',
      'PENCIL_INK': 'fine pencil and ink linework, cross-hatching, hand-drawn contour lines, minimal wash, sketchbook feel',
      'STORYBOOK': 'whimsical picture-book illustration, playful shapes, simplified forms, warm palette, gentle vignetting',
      'IMPRESSIONIST': 'classic impressionist brushwork, broken colour, dappled light, atmospheric perspective, suggestion over detail'
    };
    return translations[style] || translations['WATERCOLOUR'];
  }

  private extractStyleKeywords(prompt: string, style: ArtStyle): string[] {
    const baseKeywords = [style.toLowerCase().replace('_', ' ')];
    const styleSpecific = {
      'WATERCOLOUR': ['watercolour', 'washes', 'bleeding', 'paper'],
      'OIL_PAINTING': ['oil', 'canvas', 'impasto', 'glazing'],
      'PASTEL': ['pastel', 'dusty', 'chalk', 'soft'],
      'PENCIL_INK': ['pencil', 'ink', 'linework', 'sketch'],
      'STORYBOOK': ['storybook', 'whimsical', 'illustration', 'playful'],
      'IMPRESSIONIST': ['impressionist', 'brushwork', 'atmospheric', 'dappled']
    };
    return [...baseKeywords, ...(styleSpecific[style] || [])];
  }
}