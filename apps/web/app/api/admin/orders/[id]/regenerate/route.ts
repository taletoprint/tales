import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { PrismaClient } from '@taletoprint/database';
import { SimpleAIGenerator } from '@/lib/ai-services';
import { PrintFileGenerator } from '@/lib/print-file-generator';
import { S3PrintAssetUploader } from '@/lib/s3-uploader';
import { getProductSpec, PrintSize } from '@/lib/prodigi-client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const orderId = id;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { preview: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'PRINT_READY') {
      return NextResponse.json({ error: 'Order must be in PRINT_READY status to regenerate' }, { status: 400 });
    }

    console.log(`Admin regenerating HD file for order ${orderId}...`);

    // Update status to GENERATING
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'GENERATING' },
    });

    // Get AI service credentials
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    
    if (!openaiApiKey || !replicateToken) {
      throw new Error('Missing AI service API keys');
    }

    const generator = new SimpleAIGenerator(openaiApiKey, replicateToken);
    
    // Reconstruct preview result from order metadata
    const metadata = order.metadata as any;
    const previewResult = {
      id: order.previewId,
      imageUrl: metadata?.previewUrl || '',
      prompt: metadata?.story || 'Custom artwork',
      refinedPrompt: metadata?.refinedPrompt || metadata?.story || 'Custom artwork',
      aspect: metadata?.aspect || 'A3_landscape',
      style: metadata?.style || 'watercolour',
      timestamp: Date.now(),
      isPreview: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        generationTime: 0,
        cost: 0.002,
        styleKeywords: [metadata?.style || 'watercolour'],
        dimensions: { width: 1024, height: 1448 },
        model: metadata?.model || 'flux-schnell' as 'flux-schnell' | 'sdxl',
        has_people: metadata?.has_people ?? true
      }
    };

    // Generate new HD version
    const hdImageUrl = await generator.generateHDPrint(previewResult);
    console.log(`New HD image generated: ${hdImageUrl}`);

    // Get product spec and generate new print file
    const selectedPrintSize: PrintSize = (metadata?.printSize as PrintSize) || 'A3';
    const printGenerator = new PrintFileGenerator();
    const printFile = await printGenerator.generatePrintFile(
      hdImageUrl,
      { printSize: selectedPrintSize },
      orderId
    );

    // Upload new print-ready file to S3
    const s3Uploader = new S3PrintAssetUploader();
    const s3Upload = await s3Uploader.uploadPrintAsset(
      printFile.buffer,
      printFile.filename,
      orderId
    );

    // Update order with new files and return to PRINT_READY
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        hdImageUrl,
        printAssetUrl: s3Upload.signedUrl,
        status: 'PRINT_READY',
        metadata: {
          ...metadata,
          regeneratedAt: new Date().toISOString(),
          regeneratedBy: 'admin'
        }
      },
    });

    console.log(`Order ${orderId} HD file regenerated successfully`);

    return NextResponse.json({ 
      success: true, 
      message: 'HD file regenerated successfully',
      hdImageUrl,
      printAssetUrl: s3Upload.signedUrl
    });

  } catch (error) {
    console.error('HD regeneration error:', error);
    
    // Try to update order status back to PRINT_READY on failure
    try {
      await prisma.order.update({
        where: { id },
        data: { status: 'PRINT_READY' },
      });
    } catch (dbError) {
      console.error('Failed to reset order status:', dbError);
    }

    return NextResponse.json(
      { error: 'HD regeneration failed' },
      { status: 500 }
    );
  }
}