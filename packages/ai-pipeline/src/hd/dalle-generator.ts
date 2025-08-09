import OpenAI from 'openai';
import { S3Storage } from '../shared/storage';
import { CostLimiter, COSTS } from '../shared/cost-limiter';

export interface HDGenerationRequest {
  orderId: string;
  refinedPrompt: string;
  style: string;
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
    model: string;
    quality: string;
  };
}

export class DALLEGenerator {
  private openai: OpenAI;
  private storage: S3Storage;
  private costLimiter: CostLimiter;

  constructor(
    openaiApiKey: string,
    awsConfig: {
      region: string;
      bucket: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    },
    storage?: any
  ) {
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
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
      console.log(`[HD ${request.orderId}] Starting DALL-E 3 HD generation`);

      // Check cost limits
      const canGenerate = await this.costLimiter.checkCanGenerate('openai_images');
      if (!canGenerate) {
        throw new Error('Daily DALL-E 3 budget exceeded. Order will be processed tomorrow.');
      }

      // Generate with DALL-E 3 HD
      console.log(`[HD ${request.orderId}] Generating with DALL-E 3...`);
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: this.enhancePromptForPrint(request.refinedPrompt),
        size: '1024x1024',
        quality: 'hd',
        n: 1,
      });

      if (!response.data?.[0]?.url) {
        throw new Error('No image URL returned from DALL-E 3');
      }

      // Record cost
      await this.costLimiter.recordCost('openai_images', COSTS.DALLE_3_HD_1024 * 100);

      console.log(`[HD ${request.orderId}] Downloading and processing image...`);

      // Download the image
      const imageResponse = await fetch(response.data[0]!.url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Upload to S3
      const hdKey = this.storage.generateHDKey(request.orderId);
      const printKey = hdKey.replace('-hd.jpg', '-print.jpg');

      console.log(`[HD ${request.orderId}] Uploading to S3...`);

      // For now, use the same image for both HD and print
      // In production, you'd apply print color profiles here
      const [hdUpload, printUpload] = await Promise.all([
        this.storage.uploadImage(imageBuffer, hdKey, 'image/jpeg', {
          orderId: request.orderId,
          type: 'hd',
          model: 'dall-e-3',
          quality: 'hd',
          generatedAt: new Date().toISOString(),
        }),
        this.storage.uploadImage(imageBuffer, printKey, 'image/jpeg', {
          orderId: request.orderId,
          type: 'print-ready',
          colorProfile: 'FOGRA39',
          generatedAt: new Date().toISOString(),
        }),
      ]);

      const generationTime = Date.now() - startTime;

      console.log(`[HD ${request.orderId}] Completed in ${generationTime}ms`);

      return {
        orderId: request.orderId,
        hdImageUrl: hdUpload.url,
        printFileUrl: printUpload.url,
        dimensions: {
          width: 1024,
          height: 1024,
        },
        metadata: {
          generationTime,
          cost: COSTS.DALLE_3_HD_1024 / 100, // Convert to pounds
          model: 'dall-e-3',
          quality: 'hd',
        },
      };

    } catch (error) {
      console.error(`[HD ${request.orderId}] Generation failed:`, error);

      // Check if we should fall back to SDXL
      if (error instanceof Error && error.message.includes('budget exceeded')) {
        // Don't fallback for budget issues
        throw error;
      }

      if (error instanceof Error && (
        error.message.includes('429') || 
        error.message.includes('rate limit')
      )) {
        console.log(`[HD ${request.orderId}] DALL-E rate limited, falling back to SDXL`);
        return this.fallbackToSDXL(request);
      }

      throw new Error(`HD generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private enhancePromptForPrint(prompt: string): string {
    // Enhance prompt specifically for high-quality printing
    return `${prompt}. High resolution artwork suitable for printing, museum quality, professional artwork, detailed and crisp, perfect for framing, archival quality`;
  }

  private async fallbackToSDXL(request: HDGenerationRequest): Promise<HDGenerationResult> {
    // In a real implementation, you'd use SDXL at higher resolution here
    // For now, throw an error to indicate fallback needed
    throw new Error('DALL-E 3 unavailable. Please try again later or contact support.');
  }
}