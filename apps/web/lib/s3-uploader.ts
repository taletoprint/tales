// S3 uploader for print-ready assets
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3UploadResult {
  key: string;
  url: string;
  publicUrl: string;
  signedUrl: string;
}

export class S3PrintAssetUploader {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'taletoprint-assets';
    
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-north-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  // Upload print-ready file to S3
  async uploadPrintAsset(
    buffer: Buffer,
    filename: string,
    orderId: string,
    contentType: string = 'image/png'
  ): Promise<S3UploadResult> {
    const key = `print-assets/${orderId}/${filename}`;
    
    console.log(`[${orderId}] Uploading print asset to S3: ${key}`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          orderId,
          uploadTimestamp: new Date().toISOString(),
          purpose: 'print-fulfillment',
        },
        // Set expiration for 6 months (enough time for reprints)
        Expires: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
      });

      await this.s3Client.send(command);

      // Generate signed URL for Prodigi (valid for 24 hours)
      const signedUrl = await this.getSignedUrl(key, 24 * 60 * 60);

      const result = {
        key,
        url: `s3://${this.bucketName}/${key}`,
        publicUrl: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        signedUrl,
      };

      console.log(`[${orderId}] Print asset uploaded successfully: ${key}`);
      return result;

    } catch (error) {
      console.error(`[${orderId}] S3 upload failed:`, error);
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get signed URL for existing asset
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  // Upload HD image and create print asset in one go
  async uploadAndProcessPrintAsset(
    hdImageUrl: string,
    orderId: string,
    printSize: string
  ): Promise<S3UploadResult> {
    try {
      // Download HD image
      const response = await fetch(hdImageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download HD image: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const filename = `${orderId}_${printSize}_hd.png`;

      return await this.uploadPrintAsset(buffer, filename, orderId, 'image/png');

    } catch (error) {
      console.error(`[${orderId}] HD image upload failed:`, error);
      throw error;
    }
  }

  // Generate multiple asset URLs for different print sizes (future feature)
  async uploadMultiplePrintAssets(
    printFiles: Record<string, { buffer: Buffer; filename: string }>,
    orderId: string
  ): Promise<Record<string, S3UploadResult>> {
    const results: Record<string, S3UploadResult> = {};

    for (const [size, file] of Object.entries(printFiles)) {
      results[size] = await this.uploadPrintAsset(
        file.buffer,
        file.filename,
        orderId
      );
    }

    return results;
  }

  // Check if S3 is properly configured
  async testConnection(): Promise<boolean> {
    try {
      const testKey = `test-connection-${Date.now()}.txt`;
      const testBuffer = Buffer.from('test', 'utf8');

      await this.uploadPrintAsset(testBuffer, testKey, 'test');
      console.log('S3 connection test successful');
      return true;

    } catch (error) {
      console.error('S3 connection test failed:', error);
      return false;
    }
  }
}