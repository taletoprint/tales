import OpenAI from 'openai';

export type ArtStyle = 'WATERCOLOUR' | 'OIL_PAINTING' | 'PASTEL' | 'PENCIL_INK' | 'STORYBOOK' | 'IMPRESSIONIST';

export interface PromptRefinementRequest {
  story: string;
  style: ArtStyle;
}

export interface PromptRefinementResult {
  refined_prompt: string;
  negative_prompt: string;
  style_keywords: string[];
  has_people: boolean;
  people_count: number;
  people_close_up: boolean;
  people_rendering: 'none' | 'implied' | 'distant' | 'close_up';
}

export class PromptRefiner {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async refinePrompt(request: PromptRefinementRequest): Promise<PromptRefinementResult> {
    const wrapper = this.getUniversalWrapper();
    const systemPrompt = `You are an expert at creating prompts for AI art generation that prioritizes SDXL+LoRA for superior artistic quality. Transform user stories into detailed artistic prompts while minimizing explicit people unless they are the main subject.

STRATEGY: Make SDXL+LoRA the default by representing scenes through atmosphere/aftermath rather than explicit people.

PEOPLE RENDERING STRATEGY:
1. KEEP people when they ARE the main subject:
   - Family gatherings: "family around table", "cooking together", "gathered for dinner"
   - Group activities: "friends playing", "children laughing", "wedding celebration"
   - Portraits and explicit people scenes

2. MINIMIZE only for incidental/background people:
   - "walked through park" → "peaceful park path with footprints"
   - "visited the beach" → "sunny beach scene with distant figures"
   - Background activities where setting is primary

3. When showing people, optimize composition for the target model:
   - SDXL: "figures distant", "group silhouettes", avoid detailed faces
   - Flux: Can handle closer figures and clearer faces

4. Pet quantity preservation:
   - "our dog" → "single dog", "the cat" → "one cat"
   - "our dogs" → "two dogs", "three cats" → "three cats"
   - Preserve specific quantities to prevent AI adding multiple animals

PEOPLE ANALYSIS:
- people_count: Count explicit people (0, 1, 2, 3+)
- people_close_up: true only if faces/expressions are the main subject
- people_rendering: 'none'|'implied'|'distant'|'close_up'

ROUTING LOGIC:
- DEFAULT: SDXL+LoRA (superior artistic quality)
- Use Flux ONLY when: people_count >= 3 OR people_close_up = true
- ALWAYS SDXL: impressionist, oil_painting (texture fidelity critical)

UNIVERSAL WRAPPER:
Prefix: ${wrapper.prefix}
Suffix: ${wrapper.suffix}

PROMPT COMPILATION RULES:
- Structure: [Key Subject] in [Setting]; [Medium] with [3-4 max style adjectives]
- Keep it concise: Flux ignores long lists, SDXL prefers focused prompts
- Front-load important nouns: "Girl on swing under oak; spring meadow; pastel on textured paper"
- Avoid comma soup: Use short clauses separated by semicolons
- Medium-specific keywords only: Let LoRA handle the heavy lifting

Respond with JSON containing:
- refined_prompt: Compiled prompt with optimal structure for target model
- negative_prompt: Empty for Flux, can include for SDXL
- style_keywords: Array of 3-5 artistic terms
- has_people: Boolean (legacy compatibility)
- people_count: Number of explicit people (0-3+)
- people_close_up: Boolean (faces are main subject)
- people_rendering: How people should be shown`;

    const userPrompt = `Transform this story into an artistic prompt:

"${request.story}"

Style: ${request.style}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Clean and parse the JSON response (handle markdown code blocks)
      const cleanedContent = this.extractJsonFromResponse(content);
      const result = JSON.parse(cleanedContent) as PromptRefinementResult;
      
      // Add universal wrapper to refined prompt
      const wrapper = this.getUniversalWrapper();
      if (!result.refined_prompt.startsWith(wrapper.prefix)) {
        result.refined_prompt = `${wrapper.prefix} ${result.refined_prompt}`;
      }
      if (!result.refined_prompt.endsWith(wrapper.suffix)) {
        result.refined_prompt = `${result.refined_prompt} ${wrapper.suffix}`;
      }
      
      // Flux doesn't use negative prompts effectively, so keep empty
      result.negative_prompt = "";

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
    const wrapper = this.getUniversalWrapper();
    
    return {
      refined_prompt: `${wrapper.prefix} A beautiful artistic scene inspired by: ${request.story}. Artistic style with authentic medium texture, figures distant if present. ${wrapper.suffix}`,
      negative_prompt: "",
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
}