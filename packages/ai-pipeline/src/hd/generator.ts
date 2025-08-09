import { StabilityAI } from '../preview/stability-client';
import { RealESRGANUpscaler } from '../shared/upscaler';
import { S3Storage } from '../shared/storage';
import { CostLimiter, COSTS } from '../shared/cost-limiter';
import { ImageOrientation } from '@taletoprint/shared';

export interface HDGenerationRequest {
  orderId: string;
  previewId: string;
  refinedPrompt: string;
  style: string;
  orientation: ImageOrientation;
  originalStory: string;
}

export interface HDGenerationResult {
  orderId: string;
  hdImageUrl: string;
  printFileUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
  metadata: {
    generationTime: number;
    cost: number;
    upscalingTime: number;
    originalDimensions: {
      width: number;
      height: number;
    };
    scaleFactor: number;
  };
}

export class HDGenerator {
  private stabilityAI: StabilityAI;
  private upscaler: RealESRGANUpscaler;
  private storage: S3Storage;
  private costLimiter: CostLimiter;

  constructor(
    stabilityApiKey: string,
    replicateToken: string,
    awsConfig: {
      region: string;
      bucket: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    },
    storage?: any
  ) {
    this.stabilityAI = new StabilityAI(stabilityApiKey);
    this.upscaler = new RealESRGANUpscaler(replicateToken);
    this.storage = new S3Storage(
      awsConfig.region,
      awsConfig.bucket,
      awsConfig.accessKeyId,
      awsConfig.secretAccessKey
    );
    this.costLimiter = new CostLimiter(storage);
  }

  async generateHD(request: HDGenerationRequest): Promise<HDGenerationResult> {
    const startTime = Date.now();

    try {
      console.log(`[HD ${request.orderId}] Starting HD generation for preview ${request.previewId}`);

      // Check cost limits
      const canGenerateImage = await this.costLimiter.checkCanGenerate('stability_ai');
      if (!canGenerateImage) {
        throw new Error('Daily Stability AI budget exceeded. Order will be processed tomorrow.');
      }

      // Step 1: Generate high-quality base image with SDXL
      console.log(`[HD ${request.orderId}] Generating base image with SDXL...`);
      const dimensions = this.getDimensionsForOrientation(request.orientation);
      
      const imageBuffer = await this.stabilityAI.generateImage({
        prompt: this.enhancePromptForPrint(request.refinedPrompt),
        negative_prompt: this.getPrintNegativePrompt(),
        width: dimensions.width,
        height: dimensions.height,
        steps: 30, // Higher steps for better quality
        cfg_scale: 7,
        samples: 1
      });

      // Record generation cost
      await this.costLimiter.recordCost('stability_ai', COSTS.SDXL_512 * 100);

      console.log(`[HD ${request.orderId}] Base image generated, uploading for upscaling...`);

      // Step 2: Upload base image temporarily for upscaling
      const tempKey = `temp/hd-base-${request.orderId}-${Date.now()}.jpg`;
      const tempUpload = await this.storage.uploadImage(imageBuffer, tempKey, 'image/jpeg', {
        orderId: request.orderId,
        type: 'temp-hd-base',
        generatedAt: new Date().toISOString(),
      });

      // Step 3: Upscale with Real-ESRGAN
      console.log(`[HD ${request.orderId}] Upscaling with Real-ESRGAN...`);
      const upscalingResult = await this.upscaler.upscaleImage({
        imageUrl: tempUpload.url,
        orientation: request.orientation
      });

      console.log(`[HD ${request.orderId}] Upscaling completed, downloading result...`);

      // Step 4: Download upscaled image
      const upscaledResponse = await fetch(upscalingResult.upscaledUrl);
      if (!upscaledResponse.ok) {
        throw new Error(`Failed to download upscaled image: ${upscaledResponse.statusText}`);
      }
      const upscaledBuffer = Buffer.from(await upscaledResponse.arrayBuffer());

      // Step 5: Upload final images to S3
      const hdKey = this.storage.generateHDKey(request.orderId);
      const printKey = hdKey.replace('-hd.jpg', '-print.jpg');

      console.log(`[HD ${request.orderId}] Uploading final images to S3...`);

      const [hdUpload, printUpload] = await Promise.all([
        this.storage.uploadImage(upscaledBuffer, hdKey, 'image/jpeg', {
          orderId: request.orderId,
          type: 'hd',
          originalDimensions: `${dimensions.width}x${dimensions.height}`,
          finalDimensions: `${upscalingResult.finalDimensions.width}x${upscalingResult.finalDimensions.height}`,
          scaleFactor: upscalingResult.scaleFactor.toString(),
          generatedAt: new Date().toISOString(),
        }),
        // For print file, use the same upscaled image 
        // In production, you'd apply CMYK color profile conversion here
        this.storage.uploadImage(upscaledBuffer, printKey, 'image/jpeg', {
          orderId: request.orderId,
          type: 'print-ready',
          colorProfile: 'RGB', // Would be CMYK in production
          dpi: '300',
          generatedAt: new Date().toISOString(),
        }),
      ]);

      // Clean up temp file (optional - S3 lifecycle rules can handle this)
      // await this.storage.deleteImage(tempKey);

      const generationTime = Date.now() - startTime;
      const totalCost = COSTS.SDXL_512 + 0.002; // SDXL + Real-ESRGAN cost

      console.log(`[HD ${request.orderId}] Completed in ${generationTime}ms`);
      console.log(`[HD ${request.orderId}] Final dimensions: ${upscalingResult.finalDimensions.width}x${upscalingResult.finalDimensions.height}`);

      return {
        orderId: request.orderId,
        hdImageUrl: hdUpload.url,
        printFileUrl: printUpload.url,
        dimensions: upscalingResult.finalDimensions,
        metadata: {
          generationTime,
          cost: totalCost / 100, // Convert to pounds
          upscalingTime: upscalingResult.processingTime,
          originalDimensions: dimensions,
          scaleFactor: upscalingResult.scaleFactor,
        },
      };

    } catch (error) {
      console.error(`[HD ${request.orderId}] Generation failed:`, error);
      throw new Error(`HD generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private enhancePromptForPrint(prompt: string): string {
    // Enhance prompt specifically for high-quality printing
    return `${prompt}, high resolution, professional quality, detailed, crisp, perfect for printing, museum quality artwork`;
  }

  private getPrintNegativePrompt(): string {
    return 'blurry, low quality, pixelated, compressed, artifacts, noise, distorted, watermark, text, words, letters, signatures, ugly, deformed, bad anatomy, disfigured, poorly drawn, extra limbs, duplicate, mutated, bad proportions';
  }

  private getDimensionsForOrientation(orientation: ImageOrientation): { width: number; height: number } {
    // SDXL optimal dimensions - same as preview generator
    switch (orientation) {
      case ImageOrientation.LANDSCAPE:
        return { width: 1216, height: 832 }; // 19:13 ratio
      case ImageOrientation.PORTRAIT:
        return { width: 832, height: 1216 }; // 13:19 ratio
      case ImageOrientation.SQUARE:
        return { width: 1024, height: 1024 }; // 1:1 ratio
      default:
        return { width: 1216, height: 832 }; // Default to landscape
    }
  }
}