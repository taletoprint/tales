import sharp from 'sharp';

export class SimpleWatermarker {
  async applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Get image dimensions
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 512;
      const height = metadata.height || 512;

      // Create watermark SVG
      const watermarkText = 'PREVIEW - TaleToPrint.com';
      const fontSize = Math.min(width, height) * 0.06; // 6% of the smaller dimension
      
      const watermarkSvg = `
        <svg width="${width}" height="${height}">
          <defs>
            <style>
              .watermark {
                fill: white;
                fill-opacity: 0.5;
                font-family: Arial, sans-serif;
                font-size: ${fontSize}px;
                font-weight: bold;
              }
            </style>
          </defs>
          <text 
            x="50%" 
            y="50%" 
            text-anchor="middle" 
            class="watermark"
            transform="rotate(-45 ${width/2} ${height/2})"
          >
            ${watermarkText}
          </text>
        </svg>
      `;

      // Apply watermark
      const watermarkedBuffer = await sharp(imageBuffer)
        .composite([
          {
            input: Buffer.from(watermarkSvg),
            blend: 'over'
          }
        ])
        .jpeg({ quality: 90 })
        .toBuffer();

      console.log('[Watermarker] Watermark applied successfully');
      return watermarkedBuffer;
    } catch (error) {
      console.error('[Watermarker] Error applying watermark:', error);
      // Return original image if watermarking fails
      return imageBuffer;
    }
  }

  async createThumbnail(imageBuffer: Buffer, size: number = 256): Promise<Buffer> {
    try {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      console.log(`[Watermarker] Thumbnail created at ${size}x${size}`);
      return thumbnailBuffer;
    } catch (error) {
      console.error('[Watermarker] Error creating thumbnail:', error);
      // Return original image if thumbnail creation fails
      return imageBuffer;
    }
  }
}