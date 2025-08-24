import { StabilityAI } from './stability-client';
import { PromptRefiner, ArtStyle } from '../shared/prompt-refiner';
import { SimpleWatermarker } from '../shared/simple-watermarker';
import { S3Storage } from '../shared/storage';
import { CostLimiter, CostCalculator, COSTS } from '../shared/cost-limiter';
import { ImageOrientation } from '@taletoprint/shared';

export interface PreviewGenerationRequest {
  story: string;
  style: ArtStyle;
  orientation: ImageOrientation;
  userId?: string;
  ipAddress: string;
}

export interface PreviewGenerationResult {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  prompt: string;
  refinedPrompt: string;
  style: ArtStyle;
  orientation: ImageOrientation;
  timestamp: number;
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

export class PreviewGenerator {
  private stabilityAI: StabilityAI;
  private promptRefiner: PromptRefiner;
  private watermarker: SimpleWatermarker;
  private storage: S3Storage;
  private costLimiter: CostLimiter;

  constructor(
    stabilityApiKey: string,
    openaiApiKey: string,
    awsConfig: {
      region: string;
      bucket: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    },
    storage?: any // Redis or similar for cost tracking
  ) {
    this.stabilityAI = new StabilityAI(stabilityApiKey);
    this.promptRefiner = new PromptRefiner(openaiApiKey);
    this.watermarker = new SimpleWatermarker();
    this.storage = new S3Storage(
      awsConfig.region,
      awsConfig.bucket,
      awsConfig.accessKeyId,
      awsConfig.secretAccessKey
    );
    this.costLimiter = new CostLimiter(storage);
  }

  async generatePreview(request: PreviewGenerationRequest): Promise<PreviewGenerationResult> {
    const startTime = Date.now();
    const previewId = this.generatePreviewId();

    try {
      console.log(`[Preview ${previewId}] Starting generation for style: ${request.style}, orientation: ${request.orientation}`);

      // Get dimensions based on orientation
      const dimensions = this.getDimensionsForOrientation(request.orientation);
      console.log(`[Preview ${previewId}] Using dimensions: ${dimensions.width}x${dimensions.height}`);

      // Step 0: Check cost limits
      const canGenerateChat = await this.costLimiter.checkCanGenerate('openai_chat');
      const canGenerateImage = await this.costLimiter.checkCanGenerate('stability_ai');
      
      if (!canGenerateChat) {
        throw new Error('Daily OpenAI chat budget exceeded. Please try again tomorrow.');
      }
      if (!canGenerateImage) {
        throw new Error('Daily image generation budget exceeded. Please try again tomorrow.');
      }

      // Step 1: Refine the prompt using GPT-4
      console.log(`[Preview ${previewId}] Refining prompt...`);
      const promptRefinement = await this.promptRefiner.refinePrompt({
        story: request.story,
        style: request.style
      });

      // Record prompt refinement cost
      const promptCost = CostCalculator.estimatePromptCost(
        request.story, 
        promptRefinement.refined_prompt
      );
      await this.costLimiter.recordCost('openai_chat', promptCost);

      const promptText = promptRefinement.positive_prompt || promptRefinement.refined_prompt || '';
      console.log(`[Preview ${previewId}] Refined prompt: ${promptText}`);

      // Step 2: Generate image with Stability AI
      console.log(`[Preview ${previewId}] Generating image with Stability AI...`);
      const imageBuffer = await this.stabilityAI.generateImage({
        prompt: promptText,
        negative_prompt: promptRefinement.negative_prompt,
        width: dimensions.width,
        height: dimensions.height,
        steps: 20, // Faster for previews
        cfg_scale: 7,
        samples: 1
      });

      // Record image generation cost
      await this.costLimiter.recordCost('stability_ai', COSTS.SDXL_512 * 100); // Convert to pence

      console.log(`[Preview ${previewId}] Image generated, applying watermark...`);

      // Step 3: Apply watermark (simplified for MVP)
      const watermarkedImage = await this.watermarker.applyWatermark(imageBuffer);

      // Step 4: Create thumbnail
      const thumbnail = await this.watermarker.createThumbnail(watermarkedImage, 256);

      // Step 5: Upload to S3
      console.log(`[Preview ${previewId}] Uploading to S3...`);
      const imageKey = this.storage.generatePreviewKey(previewId);
      const thumbnailKey = this.storage.generateThumbnailKey(imageKey);

      const [imageUpload, thumbnailUpload] = await Promise.all([
        this.storage.uploadImage(watermarkedImage, imageKey, 'image/jpeg', {
          previewId,
          style: request.style,
          userId: request.userId || 'anonymous',
          ipAddress: request.ipAddress,
          generatedAt: new Date().toISOString()
        }),
        this.storage.uploadImage(thumbnail, thumbnailKey, 'image/jpeg', {
          previewId,
          type: 'thumbnail'
        })
      ]);

      const generationTime = Date.now() - startTime;
      const totalCost = (promptCost + (COSTS.SDXL_512 * 100)) / 100; // Convert back to pounds

      console.log(`[Preview ${previewId}] Completed in ${generationTime}ms`);
      console.log(`[Preview ${previewId}] Image URL: ${imageUpload.url}`);
      console.log(`[Preview ${previewId}] Thumbnail URL: ${thumbnailUpload.url}`);

      return {
        id: previewId,
        imageUrl: imageUpload.url,
        thumbnailUrl: thumbnailUpload.url,
        prompt: request.story,
        refinedPrompt: promptText,
        style: request.style,
        orientation: request.orientation,
        timestamp: Date.now(),
        expiresAt: this.calculateExpiryDate(),
        metadata: {
          generationTime,
          cost: totalCost,
          styleKeywords: promptRefinement.style_keywords,
          dimensions
        }
      };

    } catch (error) {
      console.error(`[Preview ${previewId}] Generation failed:`, error);
      throw new Error(`Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generatePreviewId(): string {
    return `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateExpiryDate(): string {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
    return expiryDate.toISOString();
  }

  private getDimensionsForOrientation(orientation: ImageOrientation): { width: number; height: number } {
    // SDXL optimal dimensions based on research
    switch (orientation) {
      case ImageOrientation.LANDSCAPE:
        return { width: 1216, height: 832 }; // 19:13 ratio (close to A3 landscape)
      case ImageOrientation.PORTRAIT:
        return { width: 832, height: 1216 }; // 13:19 ratio (close to A3 portrait)
      case ImageOrientation.SQUARE:
        return { width: 1024, height: 1024 }; // 1:1 ratio
      default:
        return { width: 1216, height: 832 }; // Default to landscape
    }
  }
}