// Simplified AI services for direct use in the web app
import OpenAI from 'openai';
import sharp from 'sharp';
import { buildPrompt } from './prompt-builder';
import { ArtStyle, Aspect, PromptBundle } from './types';
import { PromptRefiner } from '@taletoprint/ai-pipeline/src/shared/prompt-refiner';
import { S3Storage, PreviewMetadata } from '@taletoprint/ai-pipeline/src/shared/storage';
import { prisma } from './prisma';
import { 
  chooseModelJob, 
  chooseModelJobLegacy,
  getLoRAConfig,
  getLoRAKeyForStyle, 
  getModelConfig, 
  buildStylePrompt, 
  getRoutingReason,
  getRoutingReasonLegacy,
  getNegativePrompt,
  autoTuneLoRAScale,
  type ModelJob,
  type LoRAConfig as StyleLoRAConfig
} from './style-router';


interface GenerationRequest {
  story: string;
  style: ArtStyle;
  aspect: Aspect;
  ipAddress?: string;
  userId?: string;
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
    model: 'flux-dev-lora' | 'flux-schnell' | 'sdxl';
    has_people: boolean;
  };
}

export class SimpleAIGenerator {
  private openai: OpenAI;
  private replicateToken: string;
  private promptRefiner: PromptRefiner;
  private useOpenAI: boolean;
  private s3Storage: S3Storage | null;
  private fluxDevLoraVersion: string = '495498c347af810c9cafabbe931c33b3acca5667033b6d84f4975ccc01d23b96'; // Default version
  
  constructor(openaiApiKey: string, replicateToken: string, useOpenAI: boolean = true) {
    // Sanitize API key to remove any potential line breaks or whitespace
    const cleanApiKey = openaiApiKey?.trim().replace(/\s+/g, '');
    
    this.openai = new OpenAI({ apiKey: cleanApiKey });
    this.replicateToken = replicateToken;
    this.promptRefiner = new PromptRefiner(cleanApiKey);
    this.useOpenAI = useOpenAI && !!cleanApiKey; // Only use OpenAI if enabled and API key provided
    
    // Initialize S3 storage for preview archiving
    try {
      const bucket = process.env.AWS_S3_BUCKET || 'taletoprint-assets';
      this.s3Storage = new S3Storage(
        process.env.AWS_REGION || 'eu-north-1',
        bucket,
        process.env.AWS_ACCESS_KEY_ID,
        process.env.AWS_SECRET_ACCESS_KEY
      );
    } catch (error) {
      console.warn('S3 storage not available for preview archiving:', error);
      this.s3Storage = null;
    }
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

  private routeModel(promptBundle: PromptBundle): { job: ModelJob; reason: string } {
    const { has_people, style } = promptBundle.meta;
    
    // Check if we have enhanced people detection data
    const peopleCount = (promptBundle.meta as any).people_count ?? (has_people ? 1 : 0);
    const peopleCloseUp = (promptBundle.meta as any).people_close_up ?? false;
    
    // Use new routing logic with flux-dev-lora as primary
    const job = chooseModelJob(style, peopleCount, peopleCloseUp);
    const reason = getRoutingReason(style, peopleCount, peopleCloseUp, job);
    
    return { job, reason };
  }

  private enhancePromptWithLoRA(prompt: string, loraConfig: StyleLoRAConfig | null): string {
    if (!loraConfig) return prompt;
    
    // Add trigger word at the beginning of the prompt for better activation
    return `${loraConfig.trigger}, ${prompt}`;
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
          // Get base dimensions first
          const baseBundle = buildPrompt(request.story, request.style, request.aspect);
          
          const refinedResult = await this.promptRefiner.refinePrompt({
            story: request.story,
            style: this.mapArtStyleToPromptRefiner(request.style)
          }, {
            width: baseBundle.params.width,
            height: baseBundle.params.height
          });
          
          // Create a PromptBundle from the refined result (backward compatibility)
          promptBundle = {
            ...baseBundle,
            positive: refinedResult.positive_prompt || refinedResult.refined_prompt || baseBundle.positive,
            negative: refinedResult.negative_prompt || baseBundle.negative,
            params: {
              ...baseBundle.params,
              steps: refinedResult.parameters?.num_inference_steps || baseBundle.params.steps,
              cfg: refinedResult.parameters?.guidance_scale || baseBundle.params.cfg,
              width: refinedResult.parameters?.width || baseBundle.params.width,
              height: refinedResult.parameters?.height || baseBundle.params.height,
              seed: refinedResult.parameters?.seed || baseBundle.params.seed
            },
            meta: {
              ...baseBundle.meta,
              styleKeywords: refinedResult.style_keywords || [request.style],
              has_people: refinedResult.has_people ?? baseBundle.meta.has_people,
              people_count: refinedResult.people_count ?? (refinedResult.has_people ? 1 : 0),
              people_close_up: refinedResult.people_close_up ?? false,
              people_rendering: refinedResult.people_rendering || 'none'
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

      // Step 2: Route to appropriate model based on config-driven rules
      const { job, reason } = this.routeModel(promptBundle);
      console.log(`[${previewId}] Routing to ${job.model} model (${reason})`);
      
      let originalImageUrl: string;
      if (job.model === 'flux-dev-lora') {
        originalImageUrl = await this.generateWithFluxDevLora(promptBundle, job, previewId);
        console.log(`[${previewId}] Flux-Dev-LoRA image generated successfully`);
      } else if (job.model === 'flux-schnell') {
        originalImageUrl = await this.generateWithFluxSchnell(promptBundle, job, previewId);
        console.log(`[${previewId}] Flux-Schnell image generated successfully`);
      } else {
        originalImageUrl = await this.generateWithSDXL(promptBundle, job, previewId);
        console.log(`[${previewId}] SDXL image generated successfully`);
      }

      // Step 3: For now, skip processing and return original URL
      const processedImageUrl = originalImageUrl;
      console.log(`[${previewId}] Using original image (processing disabled for debugging)`);

      const generationTime = Date.now() - startTime;

      // Log model usage analytics
      const loraUsed = job.useLora && job.loraKey ? job.loraKey : 'none';
      console.log(`[ANALYTICS] Model usage: ${job.model}, has_people: ${promptBundle.meta.has_people}, style: ${request.style}, lora: ${loraUsed}, generation_time: ${generationTime}ms, aspect: ${request.aspect}`);

      const result = {
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
          model: job.model,
          has_people: promptBundle.meta.has_people
        }
      };

      // Save preview to database and queue for S3 upload (async, don't wait)  
      this.savePreviewToDatabase(result, request, generationTime).catch(error => {
        console.warn(`[${previewId}] Failed to save preview to database:`, error);
      });

      return result;

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
    // Standard HD dimensions - Real-ESRGAN ×4 upscaling from generation size
    switch (aspect) {
      case "landscape": // 3:2 landscape ratio
        return { width: 6144, height: 4096 }; // 1536×1024 → ×4
      case "portrait": // 2:3 portrait ratio  
        return { width: 4096, height: 6144 }; // 1024×1536 → ×4
      case "square": // 1:1 square ratio
      default:
        return { width: 4096, height: 4096 }; // 1024×1024 → ×4
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
      const upscaledUrl = await this.waitForReplicateCompletion(prediction.id, printId, 'Real-ESRGAN', 120000); // 2 minute timeout
      console.log(`[${printId}] Real-ESRGAN upscaling completed successfully`);
      console.log(`[${printId}] Upscaled URL:`, upscaledUrl); // Debug log
      
      return upscaledUrl;

    } catch (error) {
      console.error(`[${printId}] Real-ESRGAN upscaling failed:`, error);
      throw error;
    }
  }


  private mapDimensionsToFlux(width: number, height: number): { aspect_ratio: string; megapixels: string } {
    // Map standard dimensions to valid Flux aspect ratios
    const aspectRatio = width / height;
    
    if (Math.abs(aspectRatio - 1.0) < 0.1) {
      // Square: 1024x1024
      return { aspect_ratio: "1:1", megapixels: "1" };
    } else if (aspectRatio > 1) {
      // Landscape - 3:2 ratio (1536x1024 = 1.5)
      return { aspect_ratio: "3:2", megapixels: "1" };
    } else {
      // Portrait - 2:3 ratio (1024x1536 = 0.667)
      return { aspect_ratio: "2:3", megapixels: "1" };
    }
  }

  private async generateWithFluxSchnell(promptBundle: PromptBundle, job: ModelJob, previewId: string): Promise<string> {
    try {
      console.log(`[${previewId}] Starting Flux-Schnell generation via Replicate with prompt bundle...`);
      
      // Get LoRA configuration if needed
      const loraConfig = job.useLora && job.loraKey ? getLoRAConfig(job.loraKey) : null;
      const enhancedPrompt = this.enhancePromptWithLoRA(promptBundle.positive, loraConfig);
      
      // Get curated negative prompt for Flux
      const negativePrompt = getNegativePrompt(promptBundle.meta.style, 'flux-schnell');
      
      // Map dimensions to Flux parameters
      const fluxDimensions = this.mapDimensionsToFlux(promptBundle.params.width, promptBundle.params.height);
      
      // Get model configuration
      const modelConfig = getModelConfig('flux-schnell');
      
      console.log(`[${previewId}] Using model: ${modelConfig.version}`);
      console.log(`[${previewId}] LoRA: ${loraConfig ? `${loraConfig.url} (scale: ${loraConfig.scale})` : 'none'}`);
      
      // Prepare input parameters
      const inputParams: any = {
        prompt: enhancedPrompt,
        negative_prompt: negativePrompt,
        seed: promptBundle.params.seed,
        num_outputs: 1,
        aspect_ratio: fluxDimensions.aspect_ratio,
        megapixels: fluxDimensions.megapixels,
        output_format: "webp",
        output_quality: 80,
        ...modelConfig.params
      };
      
      // Add LoRA parameters if supported and configured
      if (modelConfig.supportsLora && loraConfig) {
        const tunedScale = autoTuneLoRAScale(loraConfig, promptBundle.meta.style, enhancedPrompt.length);
        inputParams.extra_lora = loraConfig.url;
        inputParams.extra_lora_scale = tunedScale;
        console.log(`[${previewId}] LoRA scale auto-tuned: ${loraConfig.scale} → ${tunedScale}`);
      } else if (loraConfig) {
        console.log(`[${previewId}] LoRA configured but ${job.model} doesn't support it`);
      }
      
      // Create prediction using model configuration
      const response = await this.fetchWithRetry('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: modelConfig.version,
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
          return this.generateWithFluxSchnell(promptBundle, job, previewId + '_retry');
        }
        
        throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
      }

      const prediction = await response.json();
      console.log(`[${previewId}] Flux-Schnell prediction created: ${prediction.id}`);

      // Poll for completion
      const imageUrl = await this.waitForReplicateCompletion(prediction.id, previewId, 'Flux-Schnell');
      return imageUrl;

    } catch (error) {
      console.error(`[${previewId}] Flux-Schnell generation failed:`, error);
      throw error;
    }
  }

  private async generateWithSDXL(promptBundle: PromptBundle, job: ModelJob, previewId: string): Promise<string> {
    try {
      console.log(`[${previewId}] Starting SDXL generation via Replicate with prompt bundle...`);
      
      // Get LoRA configuration if needed
      const loraConfig = job.useLora && job.loraKey ? getLoRAConfig(job.loraKey) : null;
      const enhancedPrompt = this.enhancePromptWithLoRA(promptBundle.positive, loraConfig);
      
      // Get curated negative prompt for SDXL
      const curatedNegative = getNegativePrompt(promptBundle.meta.style, 'sdxl');
      const finalNegative = curatedNegative || promptBundle.negative;
      
      // Get model configuration
      const modelConfig = getModelConfig('sdxl');
      
      console.log(`[${previewId}] Using model: ${modelConfig.version}`);
      console.log(`[${previewId}] LoRA: ${loraConfig ? `${loraConfig.url} (scale: ${loraConfig.scale})` : 'none'}`);
      
      // Prepare input parameters
      const inputParams: any = {
        prompt: enhancedPrompt,
        negative_prompt: finalNegative,
        width: promptBundle.params.width,
        height: promptBundle.params.height,
        seed: promptBundle.params.seed,
        num_outputs: 1,
        apply_watermark: false,
        output_format: "webp",
        output_quality: 80,
        ...modelConfig.params
      };
      
      // Add LoRA parameters if supported and configured
      if (modelConfig.supportsLora && loraConfig) {
        const tunedScale = autoTuneLoRAScale(loraConfig, promptBundle.meta.style, enhancedPrompt.length);
        inputParams.extra_lora = loraConfig.url;
        inputParams.extra_lora_scale = tunedScale;
        console.log(`[${previewId}] SDXL LoRA scale auto-tuned: ${loraConfig.scale} → ${tunedScale}`);
      }
      
      // Create prediction using model configuration
      const response = await this.fetchWithRetry('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: modelConfig.version,
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
          return this.generateWithSDXL(promptBundle, job, previewId + '_retry');
        }
        
        throw new Error(`Replicate SDXL API error: ${response.status} - ${errorText}`);
      }

      const prediction = await response.json();
      console.log(`[${previewId}] SDXL prediction created: ${prediction.id}`);

      // Poll for completion
      const imageUrl = await this.waitForReplicateCompletion(prediction.id, previewId, 'SDXL');
      return imageUrl;

    } catch (error) {
      console.error(`[${previewId}] SDXL generation failed:`, error);
      throw error;
    }
  }

  private async generateWithFluxDevLora(promptBundle: PromptBundle, job: ModelJob, previewId: string): Promise<string> {
    try {
      console.log(`[${previewId}] Starting Flux-Dev-LoRA generation via Replicate...`);
      
      // Get LoRA configuration
      const loraKey = job.loraKey || getLoRAKeyForStyle(promptBundle.meta.style);
      const loraConfig = getLoRAConfig(loraKey);
      
      if (!loraConfig) {
        console.warn(`[${previewId}] No LoRA config found for ${loraKey}, falling back to Flux-Schnell`);
        return this.generateWithFluxSchnell(promptBundle, job, previewId);
      }
      
      const enhancedPrompt = this.enhancePromptWithLoRA(promptBundle.positive, loraConfig);
      const negativePrompt = getNegativePrompt(promptBundle.meta.style, 'flux-dev-lora');
      
      console.log(`[${previewId}] Using LoRA: ${loraConfig.url} (scale: ${loraConfig.scale})`);
      
      // Map dimensions to Flux parameters  
      const fluxDimensions = this.mapDimensionsToFlux(promptBundle.params.width, promptBundle.params.height);
      
      // Prepare input parameters for flux-dev-lora
      const inputParams: any = {
        prompt: enhancedPrompt,
        lora_weights: loraConfig.url, // LoRA URL as string
        lora_scale: loraConfig.scale, // LoRA scale as number
        width: promptBundle.params.width,
        height: promptBundle.params.height,
        num_outputs: 1,
        guidance: 3.5, // Flux prefers lower CFG
        go_fast: true // Fuse LoRA weights for speed
      };
      
      // Add seed if provided
      if (promptBundle.params.seed) {
        inputParams.seed = promptBundle.params.seed;
      }
      
      // Create prediction using Flux-Dev-LoRA model
      
      const response = await this.fetchWithRetry('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: this.fluxDevLoraVersion,
          input: inputParams
        }),
      }, previewId, 3);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${previewId}] Flux-Dev-LoRA API error ${response.status}:`, errorText);
        
        if (response.status === 402) {
          throw new Error('Replicate account has insufficient credits. Please add credits to your Replicate account.');
        }
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || '3';
          const retrySeconds = parseInt(retryAfter);
          console.log(`[${previewId}] Rate limited, retrying in ${retrySeconds} seconds...`);
          
          await new Promise(resolve => setTimeout(resolve, (retrySeconds + 1) * 1000));
          return this.generateWithFluxDevLora(promptBundle, job, previewId + '_retry');
        }
        
        // Fallback to Flux-Schnell on API errors
        console.warn(`[${previewId}] Flux-Dev-LoRA failed, falling back to Flux-Schnell`);
        return this.generateWithFluxSchnell(promptBundle, { ...job, model: 'flux-schnell' }, previewId);
      }

      const prediction = await response.json();
      console.log(`[${previewId}] Flux-Dev-LoRA prediction created: ${prediction.id}`);

      const imageUrl = await this.waitForReplicateCompletion(prediction.id, previewId, 'Flux-Dev-LoRA', 300000); // 5 minute timeout for LoRA
      return imageUrl;

    } catch (error) {
      console.error(`[${previewId}] Flux-Dev-LoRA generation failed:`, error);
      
      // Fallback to Flux-Schnell
      console.warn(`[${previewId}] Falling back to Flux-Schnell due to Flux-Dev-LoRA error`);
      return this.generateWithFluxSchnell(promptBundle, { ...job, model: 'flux-schnell' }, previewId);
    }
  }

  private async waitForReplicateCompletion(predictionId: string, previewId: string, modelName: string = 'Model', maxWaitTime: number = 300000): Promise<string> {
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
        console.log(`[${previewId}] ${modelName} status: ${prediction.status}`);

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
          throw new Error(`${modelName} generation failed: ${prediction.error || 'Unknown error'}`);
        }

        if (prediction.status === 'canceled') {
          throw new Error(`${modelName} generation was canceled`);
        }

        // Still processing, wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`[${previewId}] Error polling ${modelName} status:`, error);
        throw error;
      }
    }

    throw new Error(`${modelName} generation timed out after ${maxWaitTime / 1000} seconds`);
  }

  private async savePreviewToS3(
    result: GenerationResult,
    promptBundle: PromptBundle,
    job: ModelJob,
    routingReason: string,
    generationTime: number,
    request: GenerationRequest
  ): Promise<void> {
    if (!this.s3Storage) {
      console.log(`[${result.id}] S3 storage not configured, skipping preview save`);
      return;
    }

    try {
      const loraConfig = job.useLora && job.loraKey ? getLoRAConfig(job.loraKey) : null;
      const modelConfig = getModelConfig(job.model);
      
      // Build comprehensive metadata for analysis
      const metadata: PreviewMetadata = {
        previewId: result.id,
        generatedAt: new Date().toISOString(),
        
        // User input
        originalStory: request.story,
        requestedStyle: request.style,
        requestedAspect: request.aspect,
        
        // AI processing
        refinedPrompt: promptBundle.positive,
        negativePrompt: promptBundle.negative,
        openaiEnhanced: this.useOpenAI,
        openaiError: undefined, // TODO: Track OpenAI errors
        
        // Model routing
        model: job.model,
        routingReason: routingReason,
        
        // People detection
        hasPeople: promptBundle.meta.has_people,
        peopleCount: (promptBundle.meta as any).people_count,
        peopleCloseUp: (promptBundle.meta as any).people_close_up,
        peopleRendering: (promptBundle.meta as any).people_rendering,
        
        // LoRA usage
        loraUsed: job.useLora,
        loraKey: job.loraKey,
        loraScale: loraConfig ? autoTuneLoRAScale(loraConfig, request.style, promptBundle.positive.length) : undefined,
        loraScaleOriginal: loraConfig?.scale,
        loraScaleAutoTuned: loraConfig ? autoTuneLoRAScale(loraConfig, request.style, promptBundle.positive.length) !== loraConfig.scale : false,
        
        // Model parameters
        modelVersion: modelConfig.version,
        guidanceScale: modelConfig.params.guidance_scale,
        steps: promptBundle.params.steps,
        seed: promptBundle.params.seed,
        dimensions: {
          width: promptBundle.params.width,
          height: promptBundle.params.height
        },
        
        // Generation metrics
        generationTimeMs: generationTime,
        estimatedCost: result.metadata?.cost || 0.002,
        phase: 'phase1', // Track optimization phases
        
        // Technical metadata
        replicateUrl: result.imageUrl,
        styleKeywords: promptBundle.meta.styleKeywords || [request.style]
      };

      await this.s3Storage.savePreviewWithMetadata(result.id, result.imageUrl, metadata);
      console.log(`[${result.id}] Preview and metadata saved to S3 successfully`);
      
    } catch (error) {
      console.error(`[${result.id}] Failed to save preview to S3:`, error);
      // Don't throw - we don't want to break the main generation flow
    }
  }

  /**
   * Track when a preview is selected for printing - updates S3 metadata for analysis
   */
  async trackPreviewToPrint(previewId: string, orderId: string): Promise<void> {
    if (!this.s3Storage) return;

    try {
      // This would typically update the metadata file in S3 to mark the preview as selected
      // For now, we'll log it and in future could implement S3 metadata updates
      console.log(`[ANALYTICS] Preview ${previewId} selected for print order ${orderId}`);
      
      // TODO: Implement S3 metadata update to track conversion
      // await this.s3Storage.updatePreviewMetadata(previewId, { selectedForPrint: true, printOrderId: orderId });
      
    } catch (error) {
      console.warn(`Failed to track preview-to-print for ${previewId}:`, error);
    }
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

  /**
   * Save preview to database and queue for S3 upload
   */
  private async savePreviewToDatabase(
    result: GenerationResult,
    request: GenerationRequest, 
    generationTime: number
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await prisma.$transaction(async (tx) => {
        // Create preview record
        await tx.preview.create({
          data: {
            id: result.id,
            imageUrl: result.imageUrl, // Replicate URL
            story: request.story,
            style: request.style,
            prompt: result.refinedPrompt || result.prompt,
            expiresAt,
            ipAddress: request.ipAddress || 'unknown',
            userId: request.userId || null,
            s3UploadStatus: 'pending',
            s3UploadAttempts: 0
          }
        });
        
        // Add to S3 upload queue
        await tx.s3UploadQueue.create({
          data: {
            previewId: result.id,
            imageUrl: result.imageUrl,
            status: 'pending',
            attempts: 0,
            nextRunAt: new Date(), // Process immediately
            s3Key: `previews/${result.id}.jpg`
          }
        });
      });
      
      console.log(`[${result.id}] Preview saved to database and queued for S3 upload`);
      
    } catch (error) {
      console.error(`[${result.id}] Failed to save preview to database:`, error);
      // Don't throw - we don't want to break the main generation flow
    }
  }

}