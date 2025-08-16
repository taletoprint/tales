import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { PrismaClient } from '@taletoprint/database';
import { SimpleAIGenerator } from '@/lib/ai-services';
import { PrintFileGenerator } from '@/lib/print-file-generator';
import { S3PrintAssetUploader } from '@/lib/s3-uploader';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const orderId = id;
  console.log(`[ADMIN-RETRY] Starting retry for order ${orderId}`);

  try {
    // Get the order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { preview: true },
    });

    if (!order) {
      console.error(`[ADMIN-RETRY] Order ${orderId} not found`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[ADMIN-RETRY] Order found:`, {
      id: order.id,
      status: order.status,
      email: order.email,
      printSize: order.printSize
    });

    // Check if order is in a retryable state
    if (['DELIVERED', 'REFUNDED'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot retry completed orders' }, { status: 400 });
    }

    // Extract metadata and preview info
    const metadata = typeof order.metadata === 'string' 
      ? JSON.parse(order.metadata) 
      : order.metadata as any;

    const previewUrl = order.preview?.imageUrl || metadata?.previewUrl;
    const story = order.preview?.story || metadata?.story;
    const style = order.preview?.style || metadata?.style;
    const refinedPrompt = metadata?.refinedPrompt;

    if (!previewUrl) {
      console.error(`[ADMIN-RETRY] Missing preview URL for order ${orderId}`);
      return NextResponse.json({ error: 'Missing preview URL in order' }, { status: 400 });
    }

    console.log(`[ADMIN-RETRY] Order data:`, {
      previewUrl: previewUrl ? 'present' : 'missing',
      story: story ? story.substring(0, 50) + '...' : 'missing',
      style,
      printSize: order.printSize,
      refinedPrompt: refinedPrompt ? 'present' : 'missing'
    });

    // Update status to GENERATING
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: 'GENERATING',
        hdImageUrl: null,
        printAssetUrl: null,
        prodigiOrderId: null,
        trackingNumber: null,
      },
    });

    // Check environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsS3Bucket = process.env.AWS_S3_BUCKET;
    const prodigiApiKey = process.env.PRODIGI_API_KEY;
    const databaseUrl = process.env.DATABASE_URL;
    
    console.log(`[ADMIN-RETRY] Environment check:`, {
      openaiApiKey: openaiApiKey ? 'present' : 'missing',
      replicateToken: replicateToken ? 'present' : 'missing',
      awsAccessKeyId: awsAccessKeyId ? 'present' : 'missing',
      awsSecretAccessKey: awsSecretAccessKey ? 'present' : 'missing',
      awsS3Bucket: awsS3Bucket ? 'present' : 'missing',
      prodigiApiKey: prodigiApiKey ? 'present' : 'missing',
      databaseUrl: databaseUrl ? 'present' : 'missing'
    });
    
    const missingKeys = [];
    if (!openaiApiKey) missingKeys.push('OPENAI_API_KEY');
    if (!replicateToken) missingKeys.push('REPLICATE_API_TOKEN');
    if (!awsAccessKeyId) missingKeys.push('AWS_ACCESS_KEY_ID');
    if (!awsSecretAccessKey) missingKeys.push('AWS_SECRET_ACCESS_KEY');
    if (!awsS3Bucket) missingKeys.push('AWS_S3_BUCKET');
    if (!prodigiApiKey) missingKeys.push('PRODIGI_API_KEY');
    if (!databaseUrl) missingKeys.push('DATABASE_URL');
    
    if (missingKeys.length > 0) {
      const error = `Missing required environment variables: ${missingKeys.join(', ')}`;
      console.error(`[ADMIN-RETRY] ${error}`);
      
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'FAILED',
          metadata: {
            ...metadata,
            retryError: error,
            retryTimestamp: new Date().toISOString()
          }
        },
      });

      return NextResponse.json({ error }, { status: 500 });
    }

    console.log(`[ADMIN-RETRY] Starting HD generation...`);
    const generator = new SimpleAIGenerator(openaiApiKey, replicateToken);
    
    // Create preview result object for HD generation
    const previewResult = {
      id: order.previewId,
      imageUrl: previewUrl,
      prompt: story || 'Custom artwork',
      refinedPrompt: refinedPrompt || story || 'Custom artwork',
      aspect: order.size as any || 'A3_landscape',
      style: style as any || 'watercolour',
      timestamp: Date.now(),
      isPreview: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        generationTime: 0,
        cost: 0.002,
        styleKeywords: [style || 'watercolour'],
        dimensions: { width: 1024, height: 1448 }
      }
    };

    // Generate HD version
    const hdImageUrl = await generator.generateHDPrint(previewResult);
    console.log(`[ADMIN-RETRY] HD image generated: ${hdImageUrl}`);

    // Generate print-ready file
    const selectedPrintSize = (order.printSize || 'A3') as any;
    console.log(`[ADMIN-RETRY] Creating print-ready file for ${selectedPrintSize}...`);
    
    const printGenerator = new PrintFileGenerator();
    const printFile = await printGenerator.generatePrintFile(
      hdImageUrl,
      { printSize: selectedPrintSize },
      orderId
    );

    // Upload to S3
    console.log(`[ADMIN-RETRY] Uploading to S3...`);
    const s3Uploader = new S3PrintAssetUploader();
    const s3Upload = await s3Uploader.uploadPrintAsset(
      printFile.buffer,
      printFile.filename,
      orderId
    );

    // Update order with success
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        hdImageUrl,
        printAssetUrl: s3Upload.signedUrl,
        status: 'AWAITING_APPROVAL',
        metadata: {
          ...metadata,
          retrySuccess: true,
          retryTimestamp: new Date().toISOString(),
          hdImageUrl,
          printAssetUrl: s3Upload.signedUrl
        }
      },
    });

    console.log(`[ADMIN-RETRY] Order ${orderId} retry completed successfully`);

    return NextResponse.json({
      success: true,
      orderId,
      status: 'AWAITING_APPROVAL',
      hdImageUrl,
      printAssetUrl: s3Upload.signedUrl,
      message: 'Order processing completed successfully'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ADMIN-RETRY] Retry failed for order ${orderId}:`, errorMessage);
    console.error(`[ADMIN-RETRY] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');

    // Update order with failure
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'FAILED',
          metadata: {
            retryError: errorMessage,
            retryTimestamp: new Date().toISOString()
          }
        },
      });
    } catch (dbError) {
      console.error(`[ADMIN-RETRY] Failed to update order status:`, dbError);
    }

    return NextResponse.json(
      { error: `Retry failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Get order status and details for debugging
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const orderId = id;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        preview: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Parse metadata if it's a string
    const metadata = typeof order.metadata === 'string' 
      ? JSON.parse(order.metadata) 
      : order.metadata;

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        email: order.email,
        printSize: order.printSize,
        price: order.price,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        hdImageUrl: order.hdImageUrl,
        printAssetUrl: order.printAssetUrl,
        prodigiOrderId: order.prodigiOrderId,
        prodigiSku: order.prodigiSku,
        trackingNumber: order.trackingNumber,
        shippingAddress: order.shippingAddress,
        metadata,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      preview: order.preview
    });

  } catch (error) {
    console.error(`[ADMIN-RETRY] Failed to get order ${orderId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}