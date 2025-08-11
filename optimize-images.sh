#!/bin/bash

# Image Optimization Script for TaleToPrint
# Using ImageMagick 6 commands (convert, identify, mogrify)

echo "🎨 TaleToPrint Image Optimization Script (ImageMagick 6)"
echo "====================================================="

# Check if ImageMagick 6 commands are available
echo "Checking ImageMagick availability..."
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick 'convert' command not found"
    exit 1
fi

if ! command -v identify &> /dev/null; then
    echo "❌ ImageMagick 'identify' command not found"
    exit 1
fi

echo "✅ ImageMagick 6 commands found!"

# Test with a simple PNG operation
echo "Testing PNG read capability..."
cd "/mnt/c/Users/Admin/OneDrive/Documents/TaletoPrint/taletoprint/apps/web/public/images"

if [ ! -f "logo/ttp_logo.png" ]; then
    echo "❌ Logo file not found!"
    exit 1
fi

# Test PNG reading
if ! identify "logo/ttp_logo.png" >/dev/null 2>&1; then
    echo "❌ Cannot read PNG files. PNG delegate missing."
    exit 1
fi

echo "✅ PNG support confirmed!"

# Optimize logo
echo ""
echo "📷 Optimizing logo..."
cd logo

# Create different sizes for different use cases
echo "  → Creating 40px logo (navigation)"
convert ttp_logo.png -resize 40x40 -quality 90 ttp_logo_40.avif 2>/dev/null || echo "    AVIF not supported, skipping..."
convert ttp_logo.png -resize 40x40 -quality 85 ttp_logo_40.webp 2>/dev/null || echo "    WebP not supported, skipping..."
convert ttp_logo.png -resize 40x40 -strip ttp_logo_40.png

echo "  → Creating 80px logo (retina)"
convert ttp_logo.png -resize 80x80 -quality 90 ttp_logo_80.avif 2>/dev/null || echo "    AVIF not supported, skipping..."
convert ttp_logo.png -resize 80x80 -quality 85 ttp_logo_80.webp 2>/dev/null || echo "    WebP not supported, skipping..."
convert ttp_logo.png -resize 80x80 -strip ttp_logo_80.png

cd ../examples

# Optimize example images  
echo ""
echo "🖼️  Optimizing example images..."
processed=0

for file in *.png; do
    if [ -f "$file" ]; then
        base=${file%.*}
        echo "  → Processing $file..."
        
        # Get original dimensions to maintain aspect ratio
        dimensions=$(identify -format "%wx%h" "$file")
        echo "    Original: $dimensions"
        
        # Create AVIF version (best compression) - square format
        if convert "$file" -resize 512x512 -quality 75 "${base}.avif" 2>/dev/null; then
            echo "    ✅ AVIF created"
        else
            echo "    ❌ AVIF failed"
        fi
        
        # Create WebP version (good compression, wider support) - square format
        if convert "$file" -resize 512x512 -quality 80 "${base}.webp" 2>/dev/null; then
            echo "    ✅ WebP created"
        else
            echo "    ❌ WebP failed"
        fi
        
        # Create optimized PNG (fallback) - square format
        if convert "$file" -resize 512x512 -strip "${base}_opt.png" 2>/dev/null; then
            echo "    ✅ Optimized PNG created"
        else
            echo "    ❌ PNG optimization failed"
        fi
        
        processed=$((processed + 1))
    fi
done

echo ""
echo "🎉 Optimization complete!"
echo "   → Processed $processed example images"
echo "   → Logo optimized for navigation use"
echo ""
echo "📊 Format details:"
echo "   • AVIF: Best compression (~50% smaller), modern browsers"
echo "   • WebP: Good compression (~30% smaller), wide browser support"  
echo "   • PNG:  Universal fallback, all browsers"
echo ""
echo "💡 Next steps:"
echo "   1. Update image references in code to use optimized versions"
echo "   2. Implement responsive loading with <picture> elements"
echo "   3. Consider using Next.js Image component for automatic optimization"