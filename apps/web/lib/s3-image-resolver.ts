import { S3Storage } from '@taletoprint/ai-pipeline/src/shared/storage';

export interface ImageUrls {
  previewUrl: string | null;
  hdImageUrl: string | null;
  source: 's3' | 'replicate' | 'fallback';
}

export class S3ImageResolver {
  private s3Storage: S3Storage | null;

  constructor() {
    try {
      const bucket = process.env.AWS_S3_BUCKET || 'taletoprint-assets';
      this.s3Storage = new S3Storage(
        process.env.AWS_REGION || 'eu-north-1',
        bucket,
        process.env.AWS_ACCESS_KEY_ID,
        process.env.AWS_SECRET_ACCESS_KEY
      );
    } catch (error) {
      console.warn('S3 storage not available for image resolution:', error);
      this.s3Storage = null;
    }
  }

  /**
   * Resolve image URLs for an order, preferring S3 over Replicate
   */
  async resolveOrderImages(order: {
    id: string;
    previewId: string;
    createdAt: string;
    hdImageUrl?: string;
    metadata?: {
      previewUrl?: string;
    };
  }): Promise<ImageUrls> {
    let previewUrl: string | null = null;
    let hdImageUrl: string | null = null;
    let source: 's3' | 'replicate' | 'fallback' = 'fallback';

    if (this.s3Storage) {
      try {
        // Try to get preview from S3 first
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        const previewKey = `previews/${orderDate}/${order.previewId}.jpg`;
        
        // Check if preview exists in S3 by trying to get a signed URL
        try {
          previewUrl = await this.s3Storage.getSignedUrl(previewKey, 3600); // 1 hour
          source = 's3';
        } catch (error) {
          // Preview not in S3, fall back to Replicate URL
          previewUrl = order.metadata?.previewUrl || null;
          source = 'replicate';
        }

        // For HD images, try S3 first with correct key format
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        const hdKey = `hd/${orderDate}/${order.id}-hd.jpg`;
        try {
          hdImageUrl = await this.s3Storage.getSignedUrl(hdKey, 3600);
          // If we got S3 HD image, keep S3 as source
        } catch (error) {
          // HD not in S3, use the existing hdImageUrl from Replicate/direct S3
          hdImageUrl = order.hdImageUrl || null;
          if (source === 's3' && hdImageUrl) {
            source = 'replicate'; // Mixed sources
          }
        }

      } catch (error) {
        console.warn('Error resolving S3 image URLs:', error);
        // Fall back to original URLs
        previewUrl = order.metadata?.previewUrl || null;
        hdImageUrl = order.hdImageUrl || null;
        source = 'fallback';
      }
    } else {
      // No S3 available, use original URLs
      previewUrl = order.metadata?.previewUrl || null;
      hdImageUrl = order.hdImageUrl || null;
      source = 'fallback';
    }

    return {
      previewUrl,
      hdImageUrl,
      source
    };
  }

  /**
   * Get preview metadata from S3
   */
  async getPreviewMetadata(previewId: string, createdAt: string) {
    if (!this.s3Storage) return null;

    try {
      const orderDate = new Date(createdAt).toISOString().split('T')[0];
      const metadataKey = `previews/${orderDate}/${previewId}_metadata.json`;
      
      const signedUrl = await this.s3Storage.getSignedUrl(metadataKey, 300); // 5 minutes
      const response = await fetch(signedUrl);
      
      if (!response.ok) return null;
      
      return await response.json();
    } catch (error) {
      console.warn('Error fetching preview metadata:', error);
      return null;
    }
  }

  /**
   * Check if S3 storage is available
   */
  isS3Available(): boolean {
    return this.s3Storage !== null;
  }
}