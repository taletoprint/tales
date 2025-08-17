// Simplified AI services for direct use in the web app
import OpenAI from 'openai';
import sharp from 'sharp';
import { buildPrompt } from './prompt-builder';
import { ArtStyle, Aspect, PromptBundle } from './types';
import { PromptRefiner } from '@taletoprint/ai-pipeline/src/shared/prompt-refiner';

interface LoRAConfig {
  flux?: {
    model: string;
    trigger: string;
    scale: number;
  };
  sdxl?: {
    model: string;
    trigger: string;
    scale: number;
  };
}

// LoRA configuration for each art style
const STYLE_LORAS: Record<ArtStyle, LoRAConfig> = {
  [ArtStyle.WATERCOLOUR]: {
    flux: {
      model: "jtorregrosa/watercolour-lora-flux",
      trigger: "W4T3RC0L0UR style",
      scale: 0.9
    },
    sdxl: {
      model: "jtorregrosa/watercolour-lora-flux", // May need SDXL alternative
      trigger: "watercolor painting",
      scale: 0.9
    }
  },
  [ArtStyle.OIL_PAINTING]: {
    flux: {
      model: "bingbangboom/flux_oilscape",
      trigger: "in the style of Oilstyle002",
      scale: 0.95
    },
    sdxl: {
      model: "doriandarko/sdxl-allaprima", // Replicate model
      trigger: "oil painting",
      scale: 0.9
    }
  },
  [ArtStyle.IMPRESSIONIST]: {
    flux: {
      model: "UmeAiRT/FLUX.1-dev-LoRA-Impressionism",
      trigger: "impressionist",
      scale: 1.0
    },
    sdxl: {
      model: "UmeAiRT/FLUX.1-dev-LoRA-Impressionism", // May need SDXL alternative
      trigger: "impressionist painting",
      scale: 0.95
    }
  },
  [ArtStyle.PASTEL]: {
    flux: {
      model: "alvdansen/flux-koda",
      trigger: "flmft style",
      scale: 0.9
    },
    sdxl: {
      model: "alvdansen/flux-koda", // May need SDXL alternative
      trigger: "pastel drawing",
      scale: 0.9
    }
  },
  [ArtStyle.PENCIL_INK]: {
    flux: {
      model: "h1t/pencil_drawing_flux_lora",
      trigger: "p3nc1l style",
      scale: 0.95
    },
    sdxl: {
      model: "h1t/pencil_drawing_flux_lora", // May need SDXL alternative
      trigger: "pencil and ink drawing",
      scale: 0.9
    }
  },
  [ArtStyle.STORYBOOK]: {
    flux: {
      model: "lucataco/flux-childrens-storybook-illustration-lora",
      trigger: "storybook illustration",
      scale: 1.0
    },
    sdxl: {
      model: "lucataco/flux-childrens-storybook-illustration-lora", // May need SDXL alternative
      trigger: "children's storybook illustration",
      scale: 0.95
    }
  }
};

interface GenerationRequest {
  story: string;
  style: ArtStyle;
  aspect: Aspect;
}

interface GenerationResult {
  id: string;
  imageUrl: string;
  prompt: string;
  refinedPrompt: string;
  aspect: Aspect;
  style: ArtStyle;
  timestamp: number;
  isPreview: boolean;
  expiresAt: string;
  metadata: {
    generationTime: number;
    cost: number;
    styleKeywords: string[];
    dimensions: {
      width: number;
      height: number;
    };
    model: 'flux-schnell' | 'sdxl';
    has_people: boolean;
  };
}

export class SimpleAIGenerator {
  private openai: OpenAI;
  private replicateToken: string;
  private promptRefiner: PromptRefiner;
  private useOpenAI: boolean;
  
  constructor(openaiApiKey: string, replicateToken: string, useOpenAI: boolean = true) {
    // Sanitize API key to remove any potential line breaks or whitespace
    const cleanApiKey = openaiApiKey?.trim().replace(/\s+/g, '');
    
    this.openai = new OpenAI({ apiKey: cleanApiKey });
    this.replicateToken = replicateToken;
    this.promptRefiner = new PromptRefiner(cleanApiKey);
    this.useOpenAI = useOpenAI && !!cleanApiKey; // Only use OpenAI if enabled and API key provided
  }

  private mapArtStyleToPromptRefiner(style: ArtStyle): import('@taletoprint/ai-pipeline/src/shared/prompt-refiner').ArtStyle {
    // Map web app ArtStyle enum to PromptRefiner ArtStyle type
    const styleMap = {
      [ArtStyle.WATERCOLOUR]: 'WATERCOLOUR' as const,
      [ArtStyle.OIL_PAINTING]: 'OIL_PAINTING' as const,
      [ArtStyle.PASTEL]: 'PASTEL' as const,
      [ArtStyle.PENCIL_INK]: 'PENCIL_INK' as const,
      [ArtStyle.STORYBOOK]: 'STORYBOOK' as const,
      [ArtStyle.IMPRESSIONIST]: 'IMPRESSIONIST' as const,
    };
    return styleMap[style];
  }

  private routeModel(promptBundle: PromptBundle): 'flux-schnell' | 'sdxl' {
    const { has_people, style } = promptBundle.meta;
    
    // Cost-conscious LoRA strategy:
    // 1. Painterly styles that need texture → SDXL (with LoRA)
    // 2. People + simple styles → Flux (cheap & fast)
    
    // Always use SDXL for styles that need heavy texture/paint effects
    if (style === ArtStyle.IMPRESSIONIST || style === ArtStyle.OIL_PAINTING) {
      return 'sdxl';
    }
    
    // Watercolor and Pastel: SDXL when no people (better texture), Flux when people (better faces)
    if ((style === ArtStyle.WATERCOLOUR || style === ArtStyle.PASTEL) && !has_people) {
      return 'sdxl';
    }
    
    // Everything else: Flux for people, SDXL for non-people
    if (has_people) {
      return 'flux-schnell';
    } else {
      return 'sdxl';
    }
  }

  private getLoRAConfig(style: ArtStyle, model: 'flux-schnell' | 'sdxl'): { model: string; trigger: string; scale: number } | null {
    const styleConfig = STYLE_LORAS[style];
    if (!styleConfig) return null;
    
    if (model === 'flux-schnell' && styleConfig.flux) {
      return styleConfig.flux;
    } else if (model === 'sdxl' && styleConfig.sdxl) {
      return styleConfig.sdxl;
    }
    
    return null;
  }

  private enhancePromptWithLoRA(prompt: string, loraConfig: { trigger: string } | null): string {
    if (!loraConfig) return prompt;
    
    // Add trigger word at the beginning of the prompt for better activation
    return `${loraConfig.trigger}, ${prompt}`;
  }

  private getRoutingReason(style: ArtStyle, hasPeople: boolean, selectedModel: 'flux-schnell' | 'sdxl'): string {
    if (style === ArtStyle.IMPRESSIONIST || style === ArtStyle.OIL_PAINTING) {
      return `${style} style needs texture → SDXL`;
    }
    if ((style === ArtStyle.WATERCOLOUR || style === ArtStyle.PASTEL) && selectedModel === 'sdxl') {
      return `${style} without people → SDXL for texture`;
    }
    if (hasPeople && selectedModel === 'flux-schnell') {
      return `people detected → Flux for faces`;
    }
    return `no people → SDXL for style`;
  }

  async generateHDPrint(previewResult: GenerationResult): Promise<string> {
    const printId = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`[${printId}] Starting HD print generation from preview ${previewResult.id}...`);
      console.log(`[${printId}] Pipeline: Pure Real-ESRGAN upscale (zero drift)`);
      console.log(`[${printId}] Original model: ${previewResult.metadata.model}, has_people: ${previewResult.metadata.has_people}`);
      
      // Log HD generation analytics
      console.log(`[ANALYTICS] HD generation: original_model=${previewResult.metadata.model}, has_people=${previewResult.metadata.has_people}, style=${previewResult.style}, aspect=${previewResult.aspect}`);
      
      // Pure Real-ESRGAN upscaling (×4 clean upscale)
      console.log(`[${printId}] Real-ESRGAN upscaling ×4...`);
      const upscaledImageUrl = await this.upscaleWithRealESRGAN(previewResult.imageUrl, 4, printId);
      
      console.log(`[${printId}] HD print generated successfully`);
      return upscaledImageUrl;
      
    } catch (error) {
      console.error(`[${printId}] HD generation failed:`, error);
      throw new Error(`HD print generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generatePreview(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const previewId = `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`[${previewId}] Starting AI generation...`);

      // Step 1: Generate structured prompt bundle (with OpenAI enhancement if enabled)
      console.log(`[${previewId}] Building prompt for ${request.style} in ${request.aspect} aspect...`);
      let promptBundle: PromptBundle;
      
      if (this.useOpenAI) {
        try {
          console.log(`[${previewId}] Using OpenAI prompt enhancement...`);
          const refinedResult = await this.promptRefiner.refinePrompt({
            story: request.story,
            style: this.mapArtStyleToPromptRefiner(request.style)
          });
          
          // Create a PromptBundle from the refined result
          const baseBundle = buildPrompt(request.story, request.style, request.aspect);
          promptBundle = {
            ...baseBundle,
            positive: refinedResult.refined_prompt,
            negative: refinedResult.negative_prompt,
            meta: {
              ...baseBundle.meta,
              styleKeywords: refinedResult.style_keywords,
              has_people: refinedResult.has_people
            }
          };
          console.log(`[${previewId}] OpenAI enhanced prompt generated successfully`);
        } catch (error) {
          console.warn(`[${previewId}] OpenAI prompt enhancement failed, falling back to heuristic:`, error);
          promptBundle = buildPrompt(request.story, request.style, request.aspect);
        }
      } else {
        console.log(`[${previewId}] Using heuristic prompt building (OpenAI disabled)...`);
        promptBundle = buildPrompt(request.story, request.style, request.aspect);
      }
      
      console.log(`[${previewId}] Prompt generated:`, {
        positive: promptBundle.positive.substring(0, 100) + '...',
        negative: promptBundle.negative.substring(0, 50) + '...',
        params: promptBundle.params
      });

      // Step 2: Route to appropriate model based on style and people detection
      const selectedModel = this.routeModel(promptBundle);
      const routingReason = this.getRoutingReason(promptBundle.meta.style, promptBundle.meta.has_people, selectedModel);
      console.log(`[${previewId}] Routing to ${selectedModel} model (${routingReason})`);
      
      let originalImageUrl: string;
      if (selectedModel === 'flux-schnell') {
        originalImageUrl = await this.generateWithFluxSchnell(promptBundle, previewId);
        console.log(`[${previewId}] Flux-Schnell image generated successfully`);
      } else {
        originalImageUrl = await this.generateWithSDXL(promptBundle, previewId);
        console.log(`[${previewId}] SDXL image generated successfully`);
      }

      // Step 3: For now, skip processing and return original URL
      const processedImageUrl = originalImageUrl;
      console.log(`[${previewId}] Using original image (processing disabled for debugging)`);

      const generationTime = Date.now() - startTime;

      // Log model usage analytics
      console.log(`[ANALYTICS] Model usage: ${selectedModel}, has_people: ${promptBundle.meta.has_people}, style: ${request.style}, generation_time: ${generationTime}ms, aspect: ${request.aspect}`);

      return {
        id: previewId,
        imageUrl: processedImageUrl,
        prompt: request.story,
        refinedPrompt: promptBundle.positive,
        aspect: request.aspect,
        style: request.style,
        timestamp: Date.now(),
        isPreview: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          generationTime,
          cost: 0.002,
          styleKeywords: promptBundle.meta.styleKeywords || [request.style],
          dimensions: {
            width: promptBundle.params.width,
            height: promptBundle.params.height
          },
          model: selectedModel,
          has_people: promptBundle.meta.has_people
        }
      };

    } catch (error) {
      console.error(`[${previewId}] Generation failed:`, error);
      throw new Error(`Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processImage(imageUrl: string, orientation: string, previewId: string): Promise<string> {
    try {
      console.log(`[${previewId}] Processing image for ${orientation} orientation...`);
      
      // For now, just return the original URL while we debug
      // TODO: Add watermarking and resizing back once stable
      console.log(`[${previewId}] Returning original image (processing temporarily disabled)`);
      return imageUrl;

    } catch (error) {
      console.error(`[${previewId}] Image processing failed:`, error);
      // Return original URL if processing fails
      return imageUrl;
    }
  }

  private createWatermarkSvg(width: number, height: number): string {
    const watermarkText = 'PREVIEW - TaleToPrint.com';
    const fontSize = Math.min(width, height) * 0.04; // 4% of the smaller dimension
    
    return `
      <svg width="${width}" height="${height}">
        <defs>
          <style>
            .watermark {
              fill: white;
              fill-opacity: 0.6;
              font-family: Arial, sans-serif;
              font-size: ${fontSize}px;
              font-weight: bold;
            }
          </style>
        </defs>
        <text 
          x="50%" 
          y="50%" 
          text-anchor="middle" 
          class="watermark"
          transform="rotate(-45 ${width/2} ${height/2})"
        >
          ${watermarkText}
        </text>
      </svg>
    `;
  }

  private getHDDimensions(aspect: Aspect): { width: number; height: number } {
    // A3 300dpi print dimensions - Real-ESRGAN compatible upscaling
    switch (aspect) {
      case "A3_landscape":
        return { width: 5792, height: 4096 }; // A3 landscape: 1448×1024 → ×4 
      case "A3_portrait":
        return { width: 4096, height: 5792 }; // A3 portrait: 1024×1448 → ×4
      case "A2_portrait":
        return { width: 4096, height: 5792 }; // Same as A3 portrait for now
      case "square":
        return { width: 4096, height: 4096 }; // Square: 1024×1024 → ×4
      default:
        return { width: 4096, height: 5792 };
    }
  }

  private async upscaleWithRealESRGAN(imageUrl: string, scale: number, printId: string): Promise<string> {
    try {
      console.log(`[${printId}] Starting Real-ESRGAN upscaling (×${scale})...`);
      
      // Create Real-ESRGAN prediction with timeout and retry
      const response = await this.fetchWithRetry('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
          input: {
            image: imageUrl,
            scale: scale, // Clean ×4 upscale
            face_enhance: false // Keep false for artwork, true only for photos
          }
        }),
      }, printId, 3);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${printId}] Real-ESRGAN API error ${response.status}:`, errorText);
        
        if (response.status === 429) {
          // Rate limited - extract retry delay and wait
          const retryAfter = response.headers.get('retry-after') || '3';
          const retrySeconds = parseInt(retryAfter);
          console.log(`[${printId}] Rate limited, retrying in ${retrySeconds} seconds...`);
          
          await new Promise(resolve => setTimeout(resolve, (retrySeconds + 1) * 1000));
          
          // Retry the request once
          return this.upscaleWithRealESRGAN(imageUrl, scale, printId + '_retry');
        }
        
        throw new Error(`Real-ESRGAN API error: ${response.status} - ${errorText}`);
      }

      const prediction = await response.json();
      console.log(`[${printId}] Real-ESRGAN prediction created: ${prediction.id}`);

      // Poll for completion
      const upscaledUrl = await this.waitForReplicateCompletion(prediction.id, printId, 120000); // 2 minute timeout
      console.log(`[${printId}] Real-ESRGAN upscaling completed successfully`);
      console.log(`[${printId}] Upscaled URL:`, upscaledUrl); // Debug log
      
      return upscaledUrl;

    } catch (error) {
      console.error(`[${printId}] Real-ESRGAN upscaling failed:`, error);
      throw error;
    }
  }


  private mapDimensionsToFlux(width: number, height: number): { aspect_ratio: string; megapixels: string } {
    // Map current dimensions to valid Flux aspect ratios
    const aspectRatio = width / height;
    
    if (Math.abs(aspectRatio - 1.0) < 0.1) {
      // Square: 1024x1024
      return { aspect_ratio: "1:1", megapixels: "1" };
    } else if (aspectRatio > 1) {
      // Landscape - map to closest valid ratio
      if (Math.abs(aspectRatio - 1.414) < 0.2) {
        // A3 landscape (1448x1024 ≈ 1.41) -> use 4:3 (1.33) as closest
        return { aspect_ratio: "4:3", megapixels: "1" };
      }
      // Default landscape
      return { aspect_ratio: "4:3", megapixels: "1" };
    } else {
      // Portrait - map to 2:3 (closest to A3/A4 ratio of 0.707)
      return { aspect_ratio: "2:3", megapixels: "1" };
    }
  }

  private async generateWithFluxSchnell(promptBundle: PromptBundle, previewId: string): Promise<string> {
    try {
      console.log(`[${previewId}] Starting Flux-Schnell generation via Replicate with prompt bundle...`);
      
      // Get LoRA configuration for this style
      const loraConfig = this.getLoRAConfig(promptBundle.meta.style, 'flux-schnell');
      const enhancedPrompt = this.enhancePromptWithLoRA(promptBundle.positive, loraConfig);
      
      // Map dimensions to Flux parameters
      const fluxDimensions = this.mapDimensionsToFlux(promptBundle.params.width, promptBundle.params.height);
      
      console.log(`[${previewId}] Using model: black-forest-labs/flux-schnell`);
      console.log(`[${previewId}] LoRA for Flux: Not supported (painterly styles routed to SDXL)`);
      
      // Prepare input parameters
      const inputParams: any = {
        prompt: enhancedPrompt,
        seed: promptBundle.params.seed,
        num_outputs: 1,
        aspect_ratio: fluxDimensions.aspect_ratio,
        megapixels: fluxDimensions.megapixels,
        output_format: "webp",
        output_quality: 80
      };
      
      // flux-schnell parameters (LoRA not supported, will be ignored)
      inputParams.go_fast = true;
      inputParams.num_inference_steps = 4;
      
      // Note: flux-schnell doesn't support LoRA, so these params will be ignored
      // LoRA styling will come from SDXL routing for painterly styles
      if (loraConfig) {
        console.log(`[${previewId}] LoRA configured but flux-schnell doesn't support it - routed painterly styles to SDXL instead`);
      }
      
      // Create prediction using Flux-Schnell parameters with retry
      const response = await this.fetchWithRetry('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-schnell:c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e',
          input: inputParams
        }),
      }, previewId, 3);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${previewId}] Replicate API error ${response.status}:`, errorText);
        
        if (response.status === 402) {
          throw new Error('Replicate account has insufficient credits. Please add credits to your Replicate account.');
        }
        
        if (response.status === 429) {
          // Rate limited - wait and retry once
          const retryAfter = response.headers.get('retry-after') || '3';
          const retrySeconds = parseInt(retryAfter);
          console.log(`[${previewId}] Rate limited, retrying in ${retrySeconds} seconds...`);
          
          await new Promise(resolve => setTimeout(resolve, (retrySeconds + 1) * 1000));
          
          // Retry the request once with new ID
          return this.generateWithFluxSchnell(promptBundle, previewId + '_retry');
        }
        
        throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
      }

      const prediction = await response.json();
      console.log(`[${previewId}] Flux-Schnell prediction created: ${prediction.id}`);

      // Poll for completion
      const imageUrl = await this.waitForReplicateCompletion(prediction.id, previewId);
      return imageUrl;

    } catch (error) {
      console.error(`[${previewId}] Flux-Schnell generation failed:`, error);
      throw error;
    }
  }

  private async generateWithSDXL(promptBundle: PromptBundle, previewId: string): Promise<string> {
    try {
      console.log(`[${previewId}] Starting SDXL generation via Replicate with prompt bundle...`);
      
      // Get LoRA configuration for this style
      const loraConfig = this.getLoRAConfig(promptBundle.meta.style, 'sdxl');
      const enhancedPrompt = this.enhancePromptWithLoRA(promptBundle.positive, loraConfig);
      
      console.log(`[${previewId}] Using LoRA: ${loraConfig?.model || 'none'}, trigger: ${loraConfig?.trigger || 'none'}`);
      
      // Prepare input parameters
      const inputParams: any = {
        prompt: enhancedPrompt,
        negative_prompt: promptBundle.negative,
        width: promptBundle.params.width,
        height: promptBundle.params.height,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        scheduler: "DPMSolverMultistep",
        seed: promptBundle.params.seed,
        num_outputs: 1,
        apply_watermark: false,
        output_format: "webp",
        output_quality: 80
      };
      
      // Add LoRA parameters if available
      if (loraConfig) {
        inputParams.extra_lora = loraConfig.model;
        inputParams.extra_lora_scale = loraConfig.scale;
      }
      
      // Create prediction using SDXL parameters with retry
      const response = await this.fetchWithRetry('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          input: inputParams
        }),
      }, previewId, 3);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${previewId}] Replicate SDXL API error ${response.status}:`, errorText);
        
        if (response.status === 402) {
          throw new Error('Replicate account has insufficient credits. Please add credits to your Replicate account.');
        }
        
        if (response.status === 429) {
          // Rate limited - wait and retry once
          const retryAfter = response.headers.get('retry-after') || '3';
          const retrySeconds = parseInt(retryAfter);
          console.log(`[${previewId}] Rate limited, retrying in ${retrySeconds} seconds...`);
          
          await new Promise(resolve => setTimeout(resolve, (retrySeconds + 1) * 1000));
          
          // Retry the request once with new ID
          return this.generateWithSDXL(promptBundle, previewId + '_retry');
        }
        
        throw new Error(`Replicate SDXL API error: ${response.status} - ${errorText}`);
      }

      const prediction = await response.json();
      console.log(`[${previewId}] SDXL prediction created: ${prediction.id}`);

      // Poll for completion
      const imageUrl = await this.waitForReplicateCompletion(prediction.id, previewId);
      return imageUrl;

    } catch (error) {
      console.error(`[${previewId}] SDXL generation failed:`, error);
      throw error;
    }
  }


  private async waitForReplicateCompletion(predictionId: string, previewId: string, maxWaitTime: number = 120000): Promise<string> {
    const pollInterval = 3000; // 3 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${this.replicateToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to check prediction status: ${response.status}`);
        }

        const prediction = await response.json();
        console.log(`[${previewId}] SDXL status: ${prediction.status}`);

        if (prediction.status === 'succeeded') {
          console.log(`[${previewId}] Prediction output:`, prediction.output);
          console.log(`[${previewId}] Prediction output type:`, typeof prediction.output);
          
          // Handle different output formats
          if (typeof prediction.output === 'string') {
            return prediction.output; // Real-ESRGAN returns a single URL string
          } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
            return prediction.output[0]; // SDXL returns an array of URLs
          } else {
            throw new Error(`Unexpected output format: ${JSON.stringify(prediction.output)}`);
          }
        }

        if (prediction.status === 'failed') {
          throw new Error(`SDXL generation failed: ${prediction.error || 'Unknown error'}`);
        }

        if (prediction.status === 'canceled') {
          throw new Error('SDXL generation was canceled');
        }

        // Still processing, wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`[${previewId}] Error polling SDXL status:`, error);
        throw error;
      }
    }

    throw new Error(`SDXL generation timed out after ${maxWaitTime / 1000} seconds`);
  }

  // Helper method for retrying fetch requests with network timeout handling
  private async fetchWithRetry(url: string, options: RequestInit, logId: string, maxRetries: number = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${logId}] Fetch attempt ${attempt}/${maxRetries}: ${url}`);
        
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`[${logId}] Fetch successful on attempt ${attempt}`);
        return response;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[${logId}] Fetch attempt ${attempt} failed:`, lastError.message);
        
        // If this is the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        console.log(`[${logId}] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw new Error(`Fetch failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

}