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

  generateHDKey(orderId: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `hd/${timestamp}/${orderId}-hd.jpg`;
  }

  generateThumbnailKey(baseKey: string): string {
    const extension = baseKey.split('.').pop();
    const baseName = baseKey.replace(`.${extension}`, '');
    return `${baseName}-thumb.${extension}`;
  }

  private getRegion(): string {
    return this.region;
  }
}