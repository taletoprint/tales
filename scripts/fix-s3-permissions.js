#!/usr/bin/env node

const { S3Client, PutObjectAclCommand } = require('@aws-sdk/client-s3');

// Configuration
const BUCKET_NAME = 'taletoprint-uploads';
const REGION = 'eu-north-1';

// LoRA files in S3
const LORA_FILES = [
  'loras/watercolour.safetensors',
  'loras/oil-painting.safetensors', 
  'loras/pastel.safetensors',
  'loras/impressionist.safetensors',
  'loras/storybook.safetensors',
  'loras/pencil-ink.safetensors'
];

// Initialize S3 client
const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function makeObjectPublic(key) {
  try {
    console.log(`Setting public-read ACL for ${key}...`);
    
    const command = new PutObjectAclCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ACL: 'public-read'
    });
    
    await s3Client.send(command);
    console.log(`✅ ${key} is now publicly readable`);
    
    const publicUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
    console.log(`   URL: ${publicUrl}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to set ACL for ${key}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('=== Setting S3 LoRA Files to Public Read ===\n');
  
  // Check AWS credentials
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('Error: AWS credentials not found');
    console.log('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables');
    process.exit(1);
  }
  
  let successCount = 0;
  
  for (const file of LORA_FILES) {
    const success = await makeObjectPublic(file);
    if (success) successCount++;
    console.log(''); // Empty line for readability
  }
  
  console.log('=== Results ===');
  console.log(`✅ Successfully made ${successCount}/${LORA_FILES.length} files public`);
  
  if (successCount === LORA_FILES.length) {
    console.log('🎉 All LoRA files are now accessible to Replicate!');
    console.log('\nNext steps:');
    console.log('1. Test a generation with oil_painting style');
    console.log('2. Check logs for S3 URLs instead of 403 errors');
  } else {
    console.log('❌ Some files failed. Check IAM permissions for PutObjectAcl action.');
  }
}

// Run the script
main().catch(console.error);