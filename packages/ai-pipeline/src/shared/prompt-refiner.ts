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
    
    const wrapper = this.getUniversalWrapper();
    const systemPrompt = `You are an expert at creating prompts for Flux-Schnell AI art generation. Transform user stories into detailed artistic prompts using the provided style template.

UNIVERSAL WRAPPER:
Prefix (always add): ${wrapper.prefix}
Suffix (always add): ${wrapper.suffix}

STYLE TEMPLATE: ${request.style}
${stylePrompts.template}

INSTRUCTIONS:
1. Start with the universal prefix, then use the template structure, replacing [main subject/action] and [setting] with content from the user's story
2. Keep all style-specific details, colors, and atmosphere from the template
3. End with the universal suffix
4. Focus on positive descriptors only - Flux doesn't use negative prompts effectively
5. Ensure the prompt will generate high-quality print artwork suitable for framing

Respond with a JSON object containing:
- refined_prompt: The complete prompt with prefix + template + suffix
- negative_prompt: Leave empty string (Flux doesn't use negative prompts)
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

  private getStylePrompt(style: ArtStyle) {
    const styles = {
      WATERCOLOUR: {
        template: `Delicate watercolour painting of [main subject/action] in [setting].
Translucent washes, soft edges, light granulation on textured paper, airy highlights.
Natural colours, gentle flow, serene atmosphere; faces softly defined, proportions consistent.`,
        keywords: ['watercolour', 'translucent washes', 'soft edges', 'granulation', 'serene']
      },
      OIL_PAINTING: {
        template: `Classic oil painting of [main subject/action] in [setting].
Textured brushstrokes, layered paint, rich mid-tones, controlled highlights and shadow.
Warm gallery feel, natural skin tones, clear faces, balanced composition.`,
        keywords: ['oil painting', 'textured brushstrokes', 'layered paint', 'gallery feel', 'balanced']
      },
      PASTEL: {
        template: `Soft pastel illustration of [main subject/action] in [setting].
Muted, airy palette (soft pinks, blues, greens), smooth shading, hand-drawn feel, calm dreamy mood.
Faces clear and natural, proportions consistent, gentle expressions.`,
        keywords: ['pastel', 'muted palette', 'smooth shading', 'dreamy mood', 'gentle']
      },
      PENCIL_INK: {
        template: `Minimalist line art of [main subject/action], [setting very brief].
Clean black ink lines, generous white space, simplified forms, subtle muted accent colour (optional).
Elegant modern composition, clear silhouette, balanced negative space.`,
        keywords: ['line art', 'minimalist', 'clean lines', 'simplified forms', 'elegant']
      },
      STORYBOOK: {
        template: `Whimsical storybook illustration of [main subject/action] in [setting].
Warm inviting palette, soft linework, simplified shapes, friendly expressions, gentle motion.
Clear character focus, readable scene, cosy atmosphere.`,
        keywords: ['storybook', 'whimsical', 'warm palette', 'friendly expressions', 'cosy']
      },
      IMPRESSIONIST: {
        template: `Hand-drawn pencil sketch of [main subject/action] in [setting].
Fine cross-hatching, soft graphite shading, subtle paper texture, gentle contrast.
Natural expressions, accurate proportions, classic sketchbook feel.`,
        keywords: ['pencil sketch', 'cross-hatching', 'graphite shading', 'paper texture', 'sketchbook']
      }
    };

    return styles[style];
  }

  private createFallbackPrompt(request: PromptRefinementRequest): PromptRefinementResult {
    const styleInfo = this.getStylePrompt(request.style);
    const wrapper = this.getUniversalWrapper();
    
    return {
      refined_prompt: `${wrapper.prefix} A beautiful artistic scene inspired by: ${request.story}. ${styleInfo.template.split('\n')[0]} ${wrapper.suffix}`,
      negative_prompt: "", // Flux doesn't use negative prompts effectively
      style_keywords: styleInfo.keywords
    };
  }
}