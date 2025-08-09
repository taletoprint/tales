import { ImageOrientation } from '@taletoprint/shared';

export interface UpscalingRequest {
  imageUrl: string;
  orientation: ImageOrientation;
  targetDimensions?: {
    width: number;
    height: number;
  };
}

export interface UpscalingResult {
  upscaledUrl: string;
  originalDimensions: {
    width: number;
    height: number;
  };
  finalDimensions: {
    width: number;
    height: number;
  };
  scaleFactor: number;
  processingTime: number;
}

export class RealESRGANUpscaler {
  private replicateToken: string;
  private baseUrl = 'https://api.replicate.com/v1';

  constructor(replicateToken: string) {
    this.replicateToken = replicateToken;
  }

  async upscaleImage(request: UpscalingRequest): Promise<UpscalingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting upscaling for image: ${request.imageUrl}`);
      
      // Determine target dimensions based on orientation
      const targetDimensions = request.targetDimensions || this.getTargetDimensions(request.orientation);
      
      // Calculate scale factor needed
      const scaleFactor = this.calculateScaleFactor(request.orientation, targetDimensions);
      
      console.log(`Target dimensions: ${targetDimensions.width}x${targetDimensions.height}, scale factor: ${scaleFactor}x`);
      
      // Call Replicate Real-ESRGAN API
      const prediction = await this.createPrediction({
        image: request.imageUrl,
        scale: scaleFactor
      });
      
      // Poll for completion
      const result = await this.waitForCompletion(prediction.id);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`Upscaling completed in ${processingTime}ms. Result: ${result.output}`);
      
      return {
        upscaledUrl: result.output,
        originalDimensions: this.getOriginalDimensions(request.orientation),
        finalDimensions: targetDimensions,
        scaleFactor,
        processingTime
      };
      
    } catch (error) {
      console.error('Upscaling failed:', error);
      throw new Error(`Upscaling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createPrediction(input: { image: string; scale: number }) {
    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
        input
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Replicate API error: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  private async waitForCompletion(predictionId: string, maxWaitTime = 300000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check prediction status: ${response.status}`);
      }

      const prediction = await response.json();

      if (prediction.status === 'succeeded') {
        return prediction;
      }

      if (prediction.status === 'failed') {
        throw new Error(`Prediction failed: ${prediction.error || 'Unknown error'}`);
      }

      if (prediction.status === 'canceled') {
        throw new Error('Prediction was canceled');
      }

      // Still processing, wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Upscaling timed out after 5 minutes');
  }

  private getTargetDimensions(orientation: ImageOrientation): { width: number; height: number } {
    // A3 at 300 DPI with 3mm bleed = 3579 x 5031 pixels
    switch (orientation) {
      case ImageOrientation.LANDSCAPE:
        return { width: 5031, height: 3579 }; // A3 landscape
      case ImageOrientation.PORTRAIT:
        return { width: 3579, height: 5031 }; // A3 portrait
      case ImageOrientation.SQUARE:
        return { width: 3579, height: 3579 }; // A3 square (cropped)
      default:
        return { width: 5031, height: 3579 }; // Default to landscape
    }
  }

  private getOriginalDimensions(orientation: ImageOrientation): { width: number; height: number } {
    // SDXL dimensions from our generator
    switch (orientation) {
      case ImageOrientation.LANDSCAPE:
        return { width: 1216, height: 832 };
      case ImageOrientation.PORTRAIT:
        return { width: 832, height: 1216 };
      case ImageOrientation.SQUARE:
        return { width: 1024, height: 1024 };
      default:
        return { width: 1216, height: 832 };
    }
  }

  private calculateScaleFactor(orientation: ImageOrientation, targetDimensions: { width: number; height: number }): number {
    const originalDimensions = this.getOriginalDimensions(orientation);
    
    // Calculate scale factors for both dimensions
    const scaleX = targetDimensions.width / originalDimensions.width;
    const scaleY = targetDimensions.height / originalDimensions.height;
    
    // Use the smaller scale factor to ensure we don't exceed target dimensions
    const scaleFactor = Math.min(scaleX, scaleY);
    
    // Round to nearest power of 2 that Real-ESRGAN supports (2, 4, 8)
    if (scaleFactor <= 2) return 2;
    if (scaleFactor <= 4) return 4;
    return 8; // Maximum supported by Real-ESRGAN
  }
}