# TaleToPrint

Transform customer stories into AI-generated art prints with our print-on-demand platform.

## Overview

TaleToPrint uses a preview-to-purchase model where users can generate low-resolution watermarked previews of their stories as art (using SDXL) for free, with rate limiting. After selecting a preview they like, they can purchase a high-quality print that will be generated using DALL-E 3 and printed on premium paper via Prodigi.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma, PostgreSQL
- **AI Services**: Stability AI (SDXL) for previews, Azure OpenAI (DALL-E 3) for HD
- **Payments**: Stripe
- **Print Partner**: Prodigi
- **Infrastructure**: Vercel, AWS S3, Redis

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- Required API keys (see `.env.example`)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/taletoprint.git
cd taletoprint
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

4. Set up the database:
```bash
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
taletoprint/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # App router pages & API routes
│       └── components/         # React components
├── packages/
│   ├── database/              # Prisma schema and client
│   ├── ai-pipeline/           # AI generation logic
│   ├── rate-limiter/         # Rate limiting
│   ├── pod-integrations/     # Prodigi integration
│   └── shared/               # Shared types and utilities
└── infrastructure/           # Deployment configs
```

## Key Features

- **Preview Generation**: Low-res watermarked previews using SDXL (£0.002/image)
- **Rate Limiting**: 3 free previews per day per IP address
- **HD Generation**: Full resolution artwork using DALL-E 3 after purchase
- **Automated Fulfillment**: Integration with Prodigi for printing and shipping
- **Cost Optimization**: Smart caching and preview model reduces AI costs by 95%

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:studio` - Open Prisma Studio
- `npm run db:push` - Push schema changes to database
- `npm test` - Run tests

## License

Private and confidential. All rights reserved.