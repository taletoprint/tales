// Print file generation for Prodigi fulfillment
import sharp from 'sharp';
import { getProductSpec, PrintSize } from './prodigi-client';

export interface PrintFileOptions {
  printSize: PrintSize;
  borderSize?: number; // Border size in mm, default 10mm
  dpi?: number; // DPI for print, default 300
}

export interface PrintFileResult {
  buffer: Buffer;
  width: number;
  height: number;
  filename: string;
}

export class PrintFileGenerator {
  
  // Convert mm to pixels at given DPI
  private mmToPixels(mm: number, dpi: number): number {
    return Math.round((mm * dpi) / 25.4);
  }

  // Generate print-ready file with borders
  async generatePrintFile(
    inputImageUrl: string,
    options: PrintFileOptions,
    orderId: string
  ): Promise<PrintFileResult> {
    const { printSize, borderSize = 10, dpi = 300 } = options;
    const productSpec = getProductSpec(printSize);
    
    console.log(`[${orderId}] Generating print file for ${printSize}...`);

    try {
      // Download the HD image
      const response = await fetch(inputImageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }
      const inputBuffer = Buffer.from(await response.arrayBuffer());

      // Calculate final print dimensions with border
      const borderPixels = this.mmToPixels(borderSize, dpi);
      const printWidth = this.mmToPixels(productSpec.dimensions.width, dpi);
      const printHeight = this.mmToPixels(productSpec.dimensions.height, dpi);
      
      // Art area (inside the border)
      const artWidth = printWidth - (borderPixels * 2);
      const artHeight = printHeight - (borderPixels * 2);

      console.log(`[${orderId}] Print dimensions: ${printWidth}×${printHeight}px`);
      console.log(`[${orderId}] Art area: ${artWidth}×${artHeight}px with ${borderPixels}px border`);

      // Process the image with sharp
      const processedBuffer = await sharp(inputBuffer)
        // Resize to fit art area (maintain aspect ratio, fit within bounds)
        .resize(artWidth, artHeight, {
          fit: 'inside',
          withoutEnlargement: false,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        // Create the final print canvas with white background
        .extend({
          top: Math.floor((artHeight - await this.getImageHeight(inputBuffer, artWidth, artHeight)) / 2) + borderPixels,
          bottom: Math.ceil((artHeight - await this.getImageHeight(inputBuffer, artWidth, artHeight)) / 2) + borderPixels,
          left: Math.floor((artWidth - await this.getImageWidth(inputBuffer, artWidth, artHeight)) / 2) + borderPixels,
          right: Math.ceil((artWidth - await this.getImageWidth(inputBuffer, artWidth, artHeight)) / 2) + borderPixels,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        // Ensure exact final dimensions
        .resize(printWidth, printHeight, {
          fit: 'fill',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        // Convert to sRGB color space for consistent printing
        .toColorspace('srgb')
        // Output as high quality PNG for lossless print
        .png({
          quality: 100,
          compressionLevel: 1,
          palette: false
        })
        .toBuffer();

      const filename = `${orderId}_${printSize}_print.png`;
      
      console.log(`[${orderId}] Print file generated: ${filename} (${processedBuffer.length} bytes)`);

      return {
        buffer: processedBuffer,
        width: printWidth,
        height: printHeight,
        filename
      };

    } catch (error) {
      console.error(`[${orderId}] Print file generation failed:`, error);
      throw new Error(`Print file generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper to calculate resized dimensions while maintaining aspect ratio
  private async getImageDimensions(buffer: Buffer, maxWidth: number, maxHeight: number): Promise<{ width: number; height: number }> {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    const originalWidth = metadata.width || 1;
    const originalHeight = metadata.height || 1;
    const aspectRatio = originalWidth / originalHeight;
    
    let newWidth = maxWidth;
    let newHeight = maxHeight;
    
    if (newWidth / newHeight > aspectRatio) {
      newWidth = newHeight * aspectRatio;
    } else {
      newHeight = newWidth / aspectRatio;
    }
    
    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  private async getImageWidth(buffer: Buffer, maxWidth: number, maxHeight: number): Promise<number> {
    const dims = await this.getImageDimensions(buffer, maxWidth, maxHeight);
    return dims.width;
  }

  private async getImageHeight(buffer: Buffer, maxWidth: number, maxHeight: number): Promise<number> {
    const dims = await this.getImageDimensions(buffer, maxWidth, maxHeight);
    return dims.height;
  }

  // Generate multiple print sizes from a single HD image (future feature)
  async generateMultiplePrintFiles(
    inputImageUrl: string,
    sizes: PrintSize[],
    orderId: string
  ): Promise<Record<PrintSize, PrintFileResult>> {
    const results: Record<PrintSize, PrintFileResult> = {} as any;
    
    for (const size of sizes) {
      results[size] = await this.generatePrintFile(
        inputImageUrl,
        { printSize: size },
        `${orderId}_${size}`
      );
    }
    
    return results;
  }
}