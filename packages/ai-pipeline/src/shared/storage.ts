import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export class S3Storage {
  private client: S3Client;
  private bucket: string;

  constructor(
    private region: string = 'eu-north-1',
    bucket: string,
    accessKeyId?: string,
    secretAccessKey?: string
  ) {
    this.bucket = bucket;
    
    const config: any = {
      region: this.region,
    };

    // Add credentials if provided (for local development)
    if (accessKeyId && secretAccessKey) {
      config.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.client = new S3Client(config);
  }

  async uploadImage(
    imageBuffer: Buffer,
    key: string,
    contentType: string = 'image/jpeg',
    metadata: Record<string, string> = {}
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
        Metadata: metadata,
        CacheControl: 'max-age=31536000', // 1 year cache
      });

      await this.client.send(command);

      // Use the region from constructor
      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

      return {
        url,
        key,
        bucket: this.bucket,
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error(`Failed to upload image: ${error}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  generatePreviewKey(previewId: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `previews/${timestamp}/${previewId}.jpg`;
  }

  generatePreviewMetadataKey(previewId: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `previews/${timestamp}/${previewId}_metadata.json`;
  }

  generateHDKey(orderId: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `hd/${timestamp}/${orderId}-hd.jpg`;
  }

  generateThumbnailKey(baseKey: string): string {
    const extension = baseKey.split('.').pop();
    const baseName = baseKey.replace(`.${extension}`, '');
    return `${baseName}-thumb.${extension}`;
  }

  async savePreviewWithMetadata(
    previewId: string,
    imageUrl: string,
    metadata: PreviewMetadata
  ): Promise<{ imageResult: UploadResult; metadataResult: UploadResult }> {
    try {
      // Download the image from Replicate
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      // Save image to S3
      const imageKey = this.generatePreviewKey(previewId);
      const imageResult = await this.uploadImage(
        imageBuffer,
        imageKey,
        'image/jpeg',
        {
          previewId,
          style: metadata.style,
          model: metadata.model,
          generatedAt: metadata.generatedAt,
        }
      );
      
      // Save metadata to S3
      const metadataKey = this.generatePreviewMetadataKey(previewId);
      const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2), 'utf8');
      const metadataResult = await this.uploadImage(
        metadataBuffer,
        metadataKey,
        'application/json',
        {
          previewId,
          type: 'metadata',
        }
      );
      
      console.log(`Preview ${previewId} saved to S3: ${imageKey}`);
      return { imageResult, metadataResult };
      
    } catch (error) {
      console.error(`Failed to save preview ${previewId} to S3:`, error);
      throw error;
    }
  }

  private getRegion(): string {
    return this.region;
  }
}

export interface PreviewMetadata {
  previewId: string;
  generatedAt: string;
  
  // User input
  originalStory: string;
  requestedStyle: string;
  requestedAspect: string;
  
  // AI processing
  refinedPrompt: string;
  negativePrompt: string;
  openaiEnhanced: boolean;
  openaiError?: string;
  
  // Model routing
  model: 'flux-schnell' | 'sdxl';
  routingReason: string;
  
  // People detection
  hasPeople: boolean;
  peopleCount?: number;
  peopleCloseUp?: boolean;
  peopleRendering?: 'none' | 'implied' | 'distant' | 'close_up';
  
  // LoRA usage
  loraUsed: boolean;
  loraKey?: string;
  loraScale?: number;
  loraScaleOriginal?: number;
  loraScaleAutoTuned?: boolean;
  
  // Model parameters
  modelVersion: string;
  guidanceScale?: number;
  steps: number;
  seed: number;
  dimensions: {
    width: number;
    height: number;
  };
  
  // Generation metrics
  generationTimeMs: number;
  estimatedCost: number;
  phase: string; // 'baseline', 'phase1', 'phase2', etc.
  
  // Quality tracking (for future use)
  userRating?: number;
  userFeedback?: string;
  selectedForPrint?: boolean;
  printOrderId?: string;
  
  // Technical metadata
  replicateUrl: string;
  s3ImageUrl?: string;
  styleKeywords: string[];
}