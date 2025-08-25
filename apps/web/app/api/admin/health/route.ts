import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

async function handleHealthGet(request: NextRequest) {
  try {
    const health = {
      database: await checkDatabase(),
      stripe: await checkStripe(),
      replicate: await checkReplicate(),
      s3: await checkS3(),
      prodigi: await checkProdigi(),
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}

async function checkDatabase() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return { status: 'healthy', latency };
  } catch (error) {
    return { status: 'error' };
  }
}

async function checkStripe() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    return { status: stripeKey ? 'healthy' : 'error' };
  } catch (error) {
    return { status: 'error' };
  }
}

async function checkReplicate() {
  try {
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    return { status: replicateToken ? 'healthy' : 'error' };
  } catch (error) {
    return { status: 'error' };
  }
}

async function checkS3() {
  try {
    const s3Config = {
      accessKey: process.env.AWS_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucket: process.env.AWS_S3_BUCKET_NAME,
    };
    const healthy = s3Config.accessKey && s3Config.secretKey && s3Config.bucket;
    return { status: healthy ? 'healthy' : 'error' };
  } catch (error) {
    return { status: 'error' };
  }
}

async function checkProdigi() {
  try {
    const prodigiKey = process.env.PRODIGI_API_KEY;
    return { status: prodigiKey ? 'healthy' : 'error' };
  } catch (error) {
    return { status: 'error' };
  }
}

export const GET = withAdminAuth(handleHealthGet);