# LoRA S3 Setup Instructions

## Step 1: Create S3 Bucket

1. Go to AWS S3 Console
2. Create a new bucket (suggested name: `taletoprint-loras`)
3. Choose region: `eu-north-1` (or your preferred region)
4. Uncheck "Block all public access" (we need public read for Replicate)
5. Create the bucket

## Step 2: Run Upload Script

```bash
# Set your AWS credentials
export AWS_ACCESS_KEY_ID=your_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_key

# Navigate to scripts directory
cd /mnt/c/Users/Admin/OneDrive/Documents/TaleToPrint/taletoprint/scripts

# Run the upload script
node upload-loras-to-s3.js
```

The script will:
- Upload all 6 LoRA files (~897MB total)
- Set public read permissions
- Output the S3 URLs

## Step 3: Update Configuration

After the upload completes:

1. Copy the S3 URLs from the script output
2. Edit `/apps/web/config/styles.config.json`
3. Replace the "loras" section with the new S3 URLs
4. You can use `lora-s3-config-template.json` as a reference

## Step 4: Test Each Style

Test commands to verify each LoRA works:

```bash
# Test watercolour
curl -X POST http://localhost:3000/api/preview/generate \
  -H "Content-Type: application/json" \
  -d '{"story": "A peaceful lake at sunset", "style": "watercolour", "aspect": "landscape"}'

# Test oil painting
curl -X POST http://localhost:3000/api/preview/generate \
  -H "Content-Type: application/json" \
  -d '{"story": "A cozy cottage in the countryside", "style": "oil_painting", "aspect": "landscape"}'

# Continue for other styles...
```

## Step 5: Fine-tune (Optional)

Based on test results, you may want to adjust:
- `scale` values (0.5-1.0, higher = stronger style)
- `trigger` words (check Civitai model pages for recommended triggers)

## Troubleshooting

1. **403 Forbidden errors**: Check bucket policy is set correctly
2. **Slow downloads**: Consider enabling CloudFront CDN
3. **Style not applying**: Increase scale value or adjust trigger words

## Cost Estimate

- Storage: ~$0.02/month for 897MB
- Transfer: ~$0.09/GB (only charged after 1GB/month free tier)
- Total: Less than $1/month for typical usage