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
}

export class PromptRefiner {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async refinePrompt(request: PromptRefinementRequest): Promise<PromptRefinementResult> {
    // First detect people to choose appropriate template
    const has_people = this.detectPeopleInStory(request.story, request.style);
    const stylePrompts = this.getStylePrompt(request.style, has_people);
    
    const wrapper = this.getUniversalWrapper();
    const modelInfo = has_people ? "Flux-Schnell (optimized for people/faces)" : "SDXL (optimized for artistic style)";
    const systemPrompt = `You are an expert at creating prompts for AI art generation and analyzing story content. Transform user stories into detailed artistic prompts using the provided style template.

TARGET MODEL: ${modelInfo}

UNIVERSAL WRAPPER:
Prefix (always add): ${wrapper.prefix}
Suffix (always add): ${wrapper.suffix}

STYLE TEMPLATE: ${request.style} (${has_people ? 'People-optimized' : 'Style-optimized'})
${stylePrompts.template}

INSTRUCTIONS:
1. ANALYZE the story for people: Detect if the story mentions any humans (people, family members, "we/us", faces, hands, silhouettes, crowds, etc.)
2. Start with the universal prefix, then use the template structure, replacing [main subject/action] and [setting] with content from the user's story
3. Keep all style-specific details, colors, and atmosphere from the template
4. End with the universal suffix
5. Focus on positive descriptors only
6. Ensure the prompt will generate high-quality print artwork suitable for framing

PEOPLE DETECTION RULES:
- has_people = true if story mentions: humans, family, people, "we", "us", "I", faces, hands, silhouettes, children, adults, names of people
- has_people = true for STORYBOOK style (Flux handles this well) unless story clearly excludes people
- has_people = false for stories about objects, landscapes, buildings, animals only (without people)
- When in doubt, bias toward has_people = false (use SDXL by default)

Respond with a JSON object containing:
- refined_prompt: The complete prompt with prefix + template + suffix
- negative_prompt: Leave empty string for Flux, can include for SDXL
- style_keywords: Array of 3-5 key artistic terms for this style
- has_people: Boolean indicating if the story involves people/humans`;

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

      // Parse the JSON response
      const result = JSON.parse(content) as PromptRefinementResult;
      
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
    const has_people = this.detectPeopleInStory(request.story, request.style);
    const styleInfo = this.getStylePrompt(request.style, has_people);
    const wrapper = this.getUniversalWrapper();
    
    return {
      refined_prompt: `${wrapper.prefix} A beautiful artistic scene inspired by: ${request.story}. ${styleInfo.template.split('\n')[0]} ${wrapper.suffix}`,
      negative_prompt: "", // Empty for Flux, can be populated for SDXL
      style_keywords: styleInfo.keywords,
      has_people
    };
  }

  private detectPeopleInStory(story: string, style: ArtStyle): boolean {
    const lowerStory = story.toLowerCase();
    
    // People keywords - explicit mentions
    const peopleKeywords = [
      'people', 'person', 'family', 'mother', 'father', 'parent', 'child', 'children',
      'grandma', 'grandpa', 'grandmother', 'grandfather', 'mum', 'dad', 'mom',
      'sister', 'brother', 'uncle', 'aunt', 'cousin', 'friend', 'friends',
      'we ', 'us ', 'our ', 'i ', 'my ', 'me ', 'myself',
      'face', 'faces', 'hands', 'smile', 'smiling', 'laughing', 'crying',
      'silhouette', 'silhouettes', 'crowd', 'group', 'together',
      'human', 'humans', 'man', 'woman', 'boy', 'girl', 'baby',
      'wedding', 'birthday', 'anniversary', 'celebration'
    ];
    
    // Check for people keywords
    const hasPeopleKeywords = peopleKeywords.some(keyword => lowerStory.includes(keyword));
    
    // Style bias - STORYBOOK often includes people
    const styleHasPeopleBias = style === 'STORYBOOK';
    
    // Animals-only keywords that suggest no people
    const animalOnlyKeywords = ['cat', 'dog', 'bird', 'pet'];
    const hasOnlyAnimals = animalOnlyKeywords.some(keyword => lowerStory.includes(keyword)) 
                          && !hasPeopleKeywords;
    
    // Object/landscape keywords that suggest no people
    const objectKeywords = ['flower', 'tree', 'building', 'house', 'landscape', 'garden'];
    const hasOnlyObjects = objectKeywords.some(keyword => lowerStory.includes(keyword)) 
                          && !hasPeopleKeywords;
    
    // Default to SDXL unless we're confident there are people
    if (hasOnlyAnimals || hasOnlyObjects) {
      return false;
    }
    
    // Only return true if we have explicit people keywords OR it's storybook style
    return hasPeopleKeywords || styleHasPeopleBias;
  }
}