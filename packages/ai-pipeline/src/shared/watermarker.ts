import sharp from 'sharp';

export interface WatermarkOptions {
  text?: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  rotation?: number;
  position?: 'center' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-left';
}

export class Watermarker {
  async applyWatermark(
    imageBuffer: Buffer, 
    options: WatermarkOptions = {}
  ): Promise<Buffer> {
    const {
      text = 'PREVIEW - TaleToPrint.com',
      opacity = 0.3,
      fontSize = 32,
      color = 'white',
      rotation = -45,
      position = 'center'
    } = options;

    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 512;
      const height = metadata.height || 512;

      // Create watermark SVG
      const watermarkSvg = this.createWatermarkSvg(
        text, 
        width, 
        height, 
        fontSize, 
        color, 
        opacity, 
        rotation,
        position
      );

      // Apply watermark
      const watermarkedImage = await sharp(imageBuffer)
        .composite([{
          input: Buffer.from(watermarkSvg),
          blend: 'over'
        }])
        .jpeg({ quality: 85 })
        .toBuffer();

      return watermarkedImage;
    } catch (error) {
      console.error('Error applying watermark:', error);
      // Return original image if watermarking fails
      return imageBuffer;
    }
  }

  private createWatermarkSvg(
    text: string,
    width: number,
    height: number,
    fontSize: number,
    color: string,
    opacity: number,
    rotation: number,
    position: string
  ): string {
    const { x, y } = this.getPosition(position, width, height);
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .watermark {
              font-family: 'Arial', sans-serif;
              font-size: ${fontSize}px;
              font-weight: bold;
              fill: ${color};
              fill-opacity: ${opacity};
              text-anchor: middle;
              dominant-baseline: central;
            }
          </style>
        </defs>
        <g transform="translate(${x}, ${y}) rotate(${rotation})">
          <text class="watermark">${text}</text>
        </g>
      </svg>
    `;
  }

  private getPosition(position: string, width: number, height: number): { x: number; y: number } {
    const padding = 50;
    
    switch (position) {
      case 'center':
        return { x: width / 2, y: height / 2 };
      case 'top-left':
        return { x: padding, y: padding };
      case 'top-right':
        return { x: width - padding, y: padding };
      case 'bottom-left':
        return { x: padding, y: height - padding };
      case 'bottom-right':
        return { x: width - padding, y: height - padding };
      default:
        return { x: width / 2, y: height / 2 };
    }
  }

  async createThumbnail(imageBuffer: Buffer, size: number = 256): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Error creating thumbnail:', error);
      throw error;
    }
  }
}