#!/bin/bash

# Image Optimization Script for TaleToPrint
# Run this script when ImageMagick is available to optimize images

echo "Optimizing TaleToPrint images..."

# Navigate to the web app directory
cd apps/web/public/images

# Optimize logo
echo "Optimizing logo..."
cd logo
magick ttp_logo.png -resize 32x32 -quality 90 ttp_logo_32.avif
magick ttp_logo.png -resize 32x32 -quality 85 ttp_logo_32.webp
magick ttp_logo.png -resize 32x32 ttp_logo_32.png

magick ttp_logo.png -resize 64x64 -quality 90 ttp_logo_64.avif  
magick ttp_logo.png -resize 64x64 -quality 85 ttp_logo_64.webp
magick ttp_logo.png -resize 64x64 ttp_logo_64.png

cd ../examples

# Optimize example images
echo "Optimizing example images..."
for file in *.png; do
    if [ -f "$file" ]; then
        base=${file%.*}
        echo "Processing $file..."
        
        # Create AVIF version (best compression)
        magick "$file" -resize 400x600 -quality 85 "${base}.avif"
        
        # Create WebP version (good compression, wider support)
        magick "$file" -resize 400x600 -quality 80 "${base}.webp"
        
        # Create optimized PNG (fallback)
        magick "$file" -resize 400x600 -strip -quality 75 "${base}_opt.png"
    fi
done

echo "Image optimization complete!"
echo "AVIF: Best compression, modern browsers"
echo "WebP: Good compression, wider support"  
echo "PNG: Fallback for older browsers"