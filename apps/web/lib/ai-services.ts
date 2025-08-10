// Simplified AI services for direct use in the web app
import OpenAI from 'openai';
import sharp from 'sharp';
import { buildPrompt } from './prompt-builder';
import { ArtStyle, Aspect, PromptBundle } from './types';

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
  };
}

export class SimpleAIGenerator {
  private openai: OpenAI;
  private replicateToken: string;
  
  constructor(openaiApiKey: string, replicateToken: string) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.replicateToken = replicateToken;
  }

  async generateHDPrint(previewResult: GenerationResult): Promise<string> {
    const printId = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`[${printId}] Starting HD print generation from preview ${previewResult.id}...`);
      console.log(`[${printId}] Pipeline: Pure Real-ESRGAN upscale (zero drift)`);
      
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

      // Step 1: Generate structured prompt bundle
      console.log(`[${previewId}] Building prompt for ${request.style} in ${request.aspect} aspect...`);
      const promptBundle = buildPrompt(request.story, request.style, request.aspect);
      console.log(`[${previewId}] Prompt generated:`, {
        positive: promptBundle.positive.substring(0, 100) + '...',
        negative: promptBundle.negative.substring(0, 50) + '...',
        params: promptBundle.params
      });

      // Step 2: Generate image with SDXL via Replicate using prompt bundle
      const originalImageUrl = await this.generateWithSDXLBundle(promptBundle, previewId);
      console.log(`[${previewId}] SDXL image generated successfully`);

      // Step 3: For now, skip processing and return original URL
      const processedImageUrl = originalImageUrl;
      console.log(`[${previewId}] Using original image (processing disabled for debugging)`);

      const generationTime = Date.now() - startTime;

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
          styleKeywords: [request.style],
          dimensions: {
            width: promptBundle.params.width,
            height: promptBundle.params.height
          }
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


  private async generateWithSDXLBundle(promptBundle: PromptBundle, previewId: string): Promise<string> {
    try {
      console.log(`[${previewId}] Starting SDXL generation via Replicate with prompt bundle...`);
      
      // Create prediction using prompt bundle parameters with retry
      const response = await this.fetchWithRetry('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          input: {
            prompt: promptBundle.positive,
            negative_prompt: promptBundle.negative,
            width: promptBundle.params.width,
            height: promptBundle.params.height,
            num_inference_steps: promptBundle.params.steps,
            guidance_scale: promptBundle.params.cfg,
            num_outputs: 1,
            scheduler: promptBundle.params.sampler,
            seed: promptBundle.params.seed
          }
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
          return this.generateWithSDXLBundle(promptBundle, previewId + '_retry');
        }
        
        throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
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