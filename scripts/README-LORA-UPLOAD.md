# LoRA S3 Upload Script

This script uploads your Civitai LoRA files to S3 for use with flux-dev-lora.

## Prerequisites

1. Create an S3 bucket (e.g., `taletoprint-loras`) in your AWS account
2. Have AWS credentials with S3 write permissions

## Setup

1. Set your AWS credentials:
   ```bash
   export AWS_ACCESS_KEY_ID=your_key_id
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   ```

2. Update the script if needed:
   - Change `BUCKET_NAME` (line 9) to your bucket name
   - Change `REGION` (line 10) to your preferred AWS region

## Usage

From the taletoprint directory:

```bash
cd scripts
node upload-loras-to-s3.js
```

## What it does

1. Sets bucket policy for public read access
2. Uploads each LoRA file with a clean filename:
   - `Eldritch_Watercolor_for_Flux_1.0.safetensors` → `watercolour.safetensors`
   - `bichu -- 250425.safetensors` → `oil-painting.safetensors`
   - `Eldritch_Pastels_for_Flux_1.0.2.safetensors` → `pastel.safetensors`
   - `open_Impressionism_v001.safetensors` → `impressionist.safetensors`
   - `Flux_cartoon_style_of_Rapunzels_Tangled_Adventure.safetensors` → `storybook.safetensors`
   - `han-drawn and watercolor style.safetensors` → `pencil-ink.safetensors`

3. Outputs the S3 URLs for updating `styles.config.json`

## File sizes

- Total upload: ~897MB
- Largest file: impressionist (257MB)
- Smallest file: storybook (19MB)

## After upload

1. Copy the generated URLs from the script output
2. Update `/apps/web/config/styles.config.json` with the new URLs
3. Test each style with flux-dev-lora

## Troubleshooting

- If bucket policy fails, set it manually in AWS Console
- Ensure your bucket name is globally unique
- Check AWS credentials are correct