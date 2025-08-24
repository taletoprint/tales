#!/usr/bin/env node

// Test script to verify LoRA configuration is loading correctly

const stylesConfig = require('../apps/web/config/styles.config.json');

console.log('=== LoRA Configuration Test ===\n');

console.log('Oil Paint LoRA:');
console.log('- Repo:', stylesConfig.loras.oil_paint.repo);
console.log('- URL:', stylesConfig.loras.oil_paint.url);
console.log('- Scale:', stylesConfig.loras.oil_paint.scale);
console.log('- Trigger:', stylesConfig.loras.oil_paint.trigger);

console.log('\nWatercolour LoRA:');
console.log('- Repo:', stylesConfig.loras.watercolour.repo);
console.log('- URL:', stylesConfig.loras.watercolour.url);
console.log('- Scale:', stylesConfig.loras.watercolour.scale);
console.log('- Trigger:', stylesConfig.loras.watercolour.trigger);

console.log('\nAll LoRA URLs:');
Object.entries(stylesConfig.loras).forEach(([key, config]) => {
  console.log(`- ${key}: ${config.url}`);
});

const hasS3URLs = Object.values(stylesConfig.loras).every(config => 
  config.url.includes('taletoprint-uploads.s3.eu-north-1.amazonaws.com')
);

console.log('\n=== Results ===');
console.log('All URLs are S3:', hasS3URLs ? '✅ YES' : '❌ NO');

if (!hasS3URLs) {
  console.log('❌ Some URLs are still pointing to HuggingFace');
  Object.entries(stylesConfig.loras).forEach(([key, config]) => {
    if (config.url.includes('huggingface.co')) {
      console.log(`  - ${key}: ${config.url}`);
    }
  });
} else {
  console.log('✅ All LoRA URLs are correctly pointing to S3');
}