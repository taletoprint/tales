#!/usr/bin/env node

/**
 * Simple Image Optimization Script using Node.js
 * Since ImageMagick PNG support is missing, we'll work with what we have
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 TaleToPrint Image Optimization (Node.js fallback)');
console.log('==================================================');

const imagesDir = path.join(__dirname, 'apps/web/public/images');
const logoDir = path.join(imagesDir, 'logo');
const examplesDir = path.join(imagesDir, 'examples');

// Check if directories exist
if (!fs.existsSync(logoDir)) {
    console.log('❌ Logo directory not found');
    process.exit(1);
}

if (!fs.existsSync(examplesDir)) {
    console.log('❌ Examples directory not found'); 
    process.exit(1);
}

// Get file sizes for comparison
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return (stats.size / 1024).toFixed(1); // KB
    } catch (e) {
        return '0';
    }
}

console.log('\n📊 Current Image Analysis:');
console.log('========================');

// Analyze logo
const logoPath = path.join(logoDir, 'ttp_logo.png');
if (fs.existsSync(logoPath)) {
    const size = getFileSize(logoPath);
    console.log(`📷 Logo: ttp_logo.png (${size} KB)`);
} else {
    console.log('❌ Logo file not found');
}

// Analyze examples
console.log('\n🖼️  Example Images:');
const examples = fs.readdirSync(examplesDir).filter(file => file.endsWith('.png'));
let totalSize = 0;

examples.forEach(file => {
    const filePath = path.join(examplesDir, file);
    const size = parseFloat(getFileSize(filePath));
    totalSize += size;
    console.log(`   • ${file}: ${size} KB`);
});

console.log(`\n📈 Total unoptimized size: ${totalSize.toFixed(1)} KB`);

console.log('\n💡 Optimization Recommendations:');
console.log('================================');
console.log('Since ImageMagick PNG support is unavailable, consider:');
console.log('');
console.log('1. 🔧 Install PNG support for ImageMagick:');
console.log('   sudo apt-get update');
console.log('   sudo apt-get install libpng-dev');
console.log('   # Then rebuild ImageMagick with PNG support');
console.log('');
console.log('2. 🌐 Use online optimization tools:');
console.log('   • TinyPNG (https://tinypng.com/) - Great PNG compression');
console.log('   • Squoosh (https://squoosh.app/) - Google\'s web image optimizer');
console.log('   • CloudConvert - Batch conversion to WebP/AVIF');
console.log('');
console.log('3. 📱 Use Next.js Image component (recommended):');
console.log('   • Automatic optimization at runtime');
console.log('   • Responsive images');  
console.log('   • Format conversion (WebP/AVIF) when supported');
console.log('');
console.log('4. 🛠️ Manual optimization targets:');
console.log('   • Logo: Resize to 40px height for navigation');
console.log('   • Examples: Resize to 512×512px (square)');
console.log('   • Target ~30-50% size reduction with WebP/AVIF');

console.log('\n✨ Next.js Image Component Benefits:');
console.log('===================================');
console.log('The Next.js Image component can handle optimization automatically:');
console.log('• Lazy loading');
console.log('• Responsive sizing');
console.log('• Modern format delivery (WebP/AVIF) when supported');
console.log('• Blur placeholder while loading');
console.log('');
console.log('Consider updating the examples page to use:');
console.log('import Image from "next/image"');
console.log('');
console.log('<Image');
console.log('  src="/images/examples/watercolour01_..."'); 
console.log('  alt="Watercolour example"');
console.log('  width={512}');
console.log('  height={512}');
console.log('  className="rounded-lg"');
console.log('/>');