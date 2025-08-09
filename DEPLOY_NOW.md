# Quick Deploy Guide

## Your code is ready! Here's what to do:

### 1. Push to GitHub
```bash
git push -u origin main
```

If push fails, use GitHub Desktop or fix token permissions.

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"  
3. Import from GitHub: `taletoprint/tales`
4. Vercel auto-detects Next.js monorepo

### 3. Environment Variables (Critical!)
Add these in Vercel dashboard:

```bash
# Database
DATABASE_URL=postgresql://user:password@your-db-host:5432/taletoprint

# Stripe (LIVE KEYS)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_SECRET

# AI Services  
REPLICATE_API_TOKEN=your_token
OPENAI_API_KEY=your_key

# AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret  
AWS_S3_BUCKET_NAME=taletoprint-assets

# Prodigi
PRODIGI_API_KEY=your_key

# Admin
ADMIN_PASSWORD=your_secure_password

# Other
NODE_ENV=production
SITE_URL=https://your-domain.vercel.app
```

### 4. After Deploy
1. Update Stripe webhook URL to: `https://your-domain.vercel.app/api/webhooks/stripe`
2. Run database migration: `npx prisma db push`
3. Access admin at: `https://your-domain.vercel.app/admin/login`

## Files Added:
- ✅ Complete admin dashboard (`/admin`)
- ✅ Vercel configuration (`vercel.json`) 
- ✅ Deployment guide (`DEPLOYMENT.md`)
- ✅ Git repository initialized
- ✅ All code committed locally

**Next**: Push to GitHub → Deploy to Vercel → Add environment variables