#!/usr/bin/env node

const { S3Client, PutObjectCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configuration
const BUCKET_NAME = 'taletoprint-uploads'; // Using existing bucket with permissions
const REGION = 'eu-north-1'; // Change this to your preferred region
const LORA_SOURCE_DIR = path.join(__dirname, '..', '..', '..', 'TaleToPrint', 'lora');

// LoRA file mapping
const LORA_MAPPING = {
  'Eldritch_Watercolor_for_Flux_1.0.safetensors': {
    targetName: 'watercolour.safetensors',
    style: 'watercolour'
  },
  'bichu -- 250425.safetensors': {
    targetName: 'oil-painting.safetensors',
    style: 'oil_painting'
  },
  'Eldritch_Pastels_for_Flux_1.0.2.safetensors': {
    targetName: 'pastel.safetensors',
    style: 'pastel'
  },
  'open_Impressionism_v001.safetensors': {
    targetName: 'impressionist.safetensors',
    style: 'impressionist'
  },
  'Flux_cartoon_style_of_Rapunzels_Tangled_Adventure.safetensors': {
    targetName: 'storybook.safetensors',
    style: 'storybook'
  },
  'han-drawn and watercolor style.safetensors': {
    targetName: 'pencil-ink.safetensors',
    style: 'pencil_ink'
  }
};

// Initialize S3 client
const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadLoRA(sourceFile, targetKey) {
  const filePath = path.join(LORA_SOURCE_DIR, sourceFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }

  const fileContent = fs.readFileSync(filePath);
  const fileSize = fs.statSync(filePath).size;
  
  console.log(`Uploading ${sourceFile} (${(fileSize / 1024 / 1024).toFixed(2)}MB) to s3://${BUCKET_NAME}/loras/${targetKey}...`);

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `loras/${targetKey}`,
      Body: fileContent,
      ContentType: 'application/octet-stream',
      CacheControl: 'public, max-age=31536000', // 1 year cache
      Metadata: {
        'original-filename': sourceFile,
        'art-style': LORA_MAPPING[sourceFile].style
      }
    });

    await s3Client.send(command);
    
    const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/loras/${targetKey}`;
    console.log(`✓ Uploaded successfully: ${url}`);
    
    return { style: LORA_MAPPING[sourceFile].style, url };
  } catch (error) {
    console.error(`✗ Failed to upload ${sourceFile}:`, error.message);
    return null;
  }
}

async function setBucketPolicy() {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${BUCKET_NAME}/loras/*`
      }
    ]
  };

  try {
    const command = new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(policy)
    });
    
    await s3Client.send(command);
    console.log('✓ Bucket policy set for public read access');
  } catch (error) {
    console.error('✗ Failed to set bucket policy:', error.message);
    console.log('Please set the bucket policy manually in AWS Console');
  }
}

async function main() {
  console.log('Starting LoRA upload to S3...\n');
  
  // Check AWS credentials
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('Error: AWS credentials not found');
    console.log('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables');
    process.exit(1);
  }

  // Set bucket policy for public access
  await setBucketPolicy();
  console.log('');

  // Upload all LoRA files
  const results = [];
  for (const [sourceFile, config] of Object.entries(LORA_MAPPING)) {
    const result = await uploadLoRA(sourceFile, config.targetName);
    if (result) {
      results.push(result);
    }
  }

  // Generate configuration snippet
  if (results.length > 0) {
    console.log('\n=== Configuration Update ===');
    console.log('Update your styles.config.json with these URLs:\n');
    
    results.forEach(({ style, url }) => {
      console.log(`"${style}": {`);
      console.log(`  "url": "${url}",`);
      console.log(`  // ... keep existing scale and trigger values`);
      console.log(`},`);
    });
    
    console.log('\n✓ Upload complete!');
  } else {
    console.log('\n✗ No files were uploaded successfully');
  }
}

// Run the script
main().catch(console.error);