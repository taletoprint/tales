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
}

export class PromptRefiner {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async refinePrompt(request: PromptRefinementRequest): Promise<PromptRefinementResult> {
    const stylePrompts = this.getStylePrompt(request.style);
    
    const systemPrompt = `You are an expert at creating prompts for SDXL AI art generation. Transform user stories into detailed artistic prompts using the provided style template.

STYLE TEMPLATE: ${request.style}
${stylePrompts.template}

INSTRUCTIONS:
1. Use the template structure above, replacing [main subject/action] and [environment details] with content from the user's story
2. Keep all style-specific details, colors, and negative prompts from the template
3. Focus on visual elements, emotions, and atmosphere from the story
4. Ensure the prompt will generate high-quality print artwork suitable for framing

Respond with a JSON object containing:
- refined_prompt: The complete prompt using the template structure
- negative_prompt: Style-specific negative prompts from template
- style_keywords: Array of 3-5 key artistic terms for this style`;

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
      
      // Add style-specific enhancements
      result.refined_prompt = this.enhanceWithStyle(result.refined_prompt, request.style);
      result.negative_prompt = this.getBaseNegativePrompt() + ', ' + result.negative_prompt;

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

  private getStylePrompt(style: ArtStyle) {
    const styles = {
      WATERCOLOUR: {
        template: `A delicate watercolour painting of [main subject/action]. 
Setting: [environment details]. 
Style: soft washes of translucent colour, light bleeding edges, textured paper effect. 
Atmosphere: gentle, flowing, airy. 
Colours: soft blends, subtle gradients, light brushstrokes. 
--no text, --no signature, --no watermark, --no harsh outlines, --no photorealism`,
        keywords: ['watercolour', 'soft washes', 'translucent', 'bleeding edges', 'flowing']
      },
      OIL_PAINTING: {
        template: `An oil painting of [main subject/action]. 
Scene: [environment details]. 
Style: traditional canvas texture, visible brushstrokes, layered oil paint. 
Inspiration: impressionist / classical fine art. 
Colours: rich and natural, with depth and light contrast. 
--no text, --no signature, --no watermark, --no cartoonish elements`,
        keywords: ['oil painting', 'brushstrokes', 'impasto', 'classical', 'canvas texture']
      },
      PASTEL: {
        template: `A soft pastel illustration of [main subject/action]. 
Setting: [environment details]. 
Colours: muted pastel palette (soft pinks, blues, greens, yellows). 
Style: children's book art, gentle pencil shading, dreamy ambience. 
Atmosphere: calm, light, peaceful. 
--no text, --no signature, --no watermark, --no harsh shadows, --no photorealism, --no yellow tint`,
        keywords: ['pastel', 'muted colors', 'dreamy', 'gentle shading', 'peaceful']
      },
      PENCIL_INK: {
        template: `Minimalist line art illustration of [main subject/action]. 
Composition: clean white background, strong simple black ink lines. 
Style: elegant, minimal, modern. 
Optional: small hints of muted colour accents. 
Focus: form, gesture, and simplicity. 
--no text, --no signature, --no watermark, --no clutter, --no shading, --no complex background`,
        keywords: ['line art', 'minimalist', 'ink lines', 'elegant', 'simple']
      },
      STORYBOOK: {
        template: `A whimsical storybook illustration of [main subject/action]. 
Scene: [environment details]. 
Colours: bright, playful palette. 
Style: hand-drawn, painterly, suitable for children's fairy tale books. 
Mood: joyful, magical, heartwarming. 
--no text, --no signature, --no watermark, --no surreal distortion, --no photorealism`,
        keywords: ['storybook', 'whimsical', 'hand-drawn', 'magical', 'painterly']
      },
      IMPRESSIONIST: {
        template: `A realistic digital painting of [main subject/action]. 
Setting: [environment details]. 
Style: painterly realism with fine brush details, soft light, accurate proportions. 
Mood: lifelike but artistic, suited for home wall art. 
Colours: balanced, natural palette. 
--no text, --no signature, --no watermark, --no surreal distortion, --no cartoon look`,
        keywords: ['realistic painting', 'painterly realism', 'soft light', 'natural', 'wall art']
      }
    };

    return styles[style];
  }

  private enhanceWithStyle(prompt: string, style: ArtStyle): string {
    const styleEnhancements = {
      WATERCOLOUR: ', painted in watercolour style with soft washes and gentle color bleeding, on textured watercolour paper',
      OIL_PAINTING: ', painted as a classical oil painting with rich textures and visible brushstrokes, museum quality',
      PASTEL: ', created as a soft pastel illustration with muted colors and dreamy ambience, children\'s book art style',
      PENCIL_INK: ', drawn as minimalist line art with elegant black ink lines and clean composition',
      STORYBOOK: ', illustrated as whimsical storybook art with hand-drawn painterly style, magical and heartwarming',
      IMPRESSIONIST: ', painted as realistic digital art with painterly realism and soft natural lighting'
    };

    return prompt + styleEnhancements[style];
  }

  private getBaseNegativePrompt(): string {
    return 'text, words, letters, signatures, watermarks, ugly, deformed, blurry, bad anatomy, disfigured, poorly drawn, extra limbs, duplicate, mutated, bad proportions';
  }

  private createFallbackPrompt(request: PromptRefinementRequest): PromptRefinementResult {
    const styleInfo = this.getStylePrompt(request.style);
    
    return {
      refined_prompt: `A beautiful artistic scene inspired by: ${request.story}. ${styleInfo.template.split('\n')[0]}`,
      negative_prompt: this.getBaseNegativePrompt(),
      style_keywords: styleInfo.keywords
    };
  }
}