import OpenAI from 'openai';

export type ArtStyle = 'WATERCOLOR' | 'OIL_PAINTING' | 'PENCIL_SKETCH' | 'VINTAGE_POSTER' | 'DIGITAL_ART' | 'IMPRESSIONIST';

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
    
    const systemPrompt = `You are an expert at creating prompts for AI art generation. Your job is to transform user stories into detailed, artistic prompts that will create beautiful, emotionally resonant artwork.

GUIDELINES:
- Focus on visual elements, emotions, and atmosphere
- Include specific artistic techniques for the chosen style
- Avoid text, words, or letters in the image
- Create prompts that are 1-2 sentences, detailed but concise
- Always include the style-specific keywords provided
- Make the scene feel warm, nostalgic, and emotionally meaningful

STYLE: ${request.style}
${stylePrompts.description}

Respond with a JSON object containing:
- refined_prompt: The optimized prompt for image generation
- negative_prompt: Things to avoid in the image
- style_keywords: Array of 3-5 key terms that reinforce the artistic style`;

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
      WATERCOLOR: {
        description: 'Soft, flowing watercolor technique with gentle color bleeds, transparent layers, and organic paper texture',
        keywords: ['watercolor', 'soft washes', 'color bleeding', 'transparent', 'flowing']
      },
      OIL_PAINTING: {
        description: 'Rich, textured oil painting with visible brushstrokes, depth, and classical composition',
        keywords: ['oil painting', 'brushstrokes', 'impasto', 'rich colors', 'classical']
      },
      PENCIL_SKETCH: {
        description: 'Delicate pencil artwork with fine line work, shading, and artistic sketch quality',
        keywords: ['pencil sketch', 'line art', 'cross-hatching', 'detailed', 'monochrome']
      },
      VINTAGE_POSTER: {
        description: 'Retro poster style with bold colors, simplified forms, and vintage advertising aesthetic',
        keywords: ['vintage poster', 'retro', 'bold colors', 'simplified', 'graphic design']
      },
      DIGITAL_ART: {
        description: 'Modern digital artwork with vibrant colors, clean lines, and contemporary artistic style',
        keywords: ['digital art', 'vibrant', 'modern', 'clean', 'contemporary']
      },
      IMPRESSIONIST: {
        description: 'Impressionist painting style with loose brushwork, light effects, and atmospheric quality',
        keywords: ['impressionist', 'loose brushwork', 'light effects', 'atmospheric', 'plein air']
      }
    };

    return styles[style];
  }

  private enhanceWithStyle(prompt: string, style: ArtStyle): string {
    const styleEnhancements = {
      WATERCOLOR: ', painted in watercolor style with soft washes and gentle color bleeding, on textured watercolor paper',
      OIL_PAINTING: ', painted as a classical oil painting with rich textures and visible brushstrokes, museum quality',
      PENCIL_SKETCH: ', drawn as a detailed pencil sketch with fine line work and artistic shading',
      VINTAGE_POSTER: ', designed as a vintage travel poster with bold colors and simplified graphic forms',
      DIGITAL_ART: ', created as modern digital artwork with vibrant colors and clean contemporary style',
      IMPRESSIONIST: ', painted in impressionist style with loose brushwork and beautiful light effects'
    };

    return prompt + styleEnhancements[style];
  }

  private getBaseNegativePrompt(): string {
    return 'text, words, letters, signatures, watermarks, ugly, deformed, blurry, bad anatomy, disfigured, poorly drawn, extra limbs, duplicate, mutated, bad proportions';
  }

  private createFallbackPrompt(request: PromptRefinementRequest): PromptRefinementResult {
    const styleInfo = this.getStylePrompt(request.style);
    
    return {
      refined_prompt: `A beautiful artistic scene inspired by: ${request.story}. ${styleInfo.description}`,
      negative_prompt: this.getBaseNegativePrompt(),
      style_keywords: styleInfo.keywords
    };
  }
}