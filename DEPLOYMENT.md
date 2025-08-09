# Deployment Guide

## Vercel Deployment

### Environment Variables Required

Set these in your Vercel dashboard:

```bash
# Node Environment
NODE_ENV=production

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@your-db-host:5432/taletoprint

# Stripe Payment Processing (LIVE KEYS)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY

# AI Services
REPLICATE_API_TOKEN=your_replicate_token
OPENAI_API_KEY=your_openai_key

# AWS S3 Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=taletoprint-assets
AWS_REGION=eu-west-2

# Print-on-Demand (Prodigi)
PRODIGI_API_KEY=your_prodigi_api_key

# Admin Access
ADMIN_PASSWORD=your_secure_admin_password

# Site Configuration
BUSINESS_NAME=Tale To Print
SITE_URL=https://your-domain.com
```

### Deployment Steps

1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Configure Build**: Vercel auto-detects Next.js monorepo
3. **Set Environment Variables**: Add all variables above in Vercel dashboard
4. **Deploy**: Vercel will automatically build and deploy

### Database Setup

Your PostgreSQL database needs to be accessible from Vercel. Run this after deployment:

```bash
npx prisma db push
```

### Webhook Configuration

After deployment, update your Stripe webhook endpoint to:
```
https://your-domain.com/api/webhooks/stripe
```

### Admin Access

Access your admin dashboard at:
```
https://your-domain.com/admin/login
```

Use the password set in `ADMIN_PASSWORD` environment variable.