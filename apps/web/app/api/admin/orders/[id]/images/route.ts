import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { S3ImageResolver } from '@/lib/s3-image-resolver';

export async function GET(
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
      select: {
        id: true,
        previewId: true,
        createdAt: true,
        hdImageUrl: true,
        metadata: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const imageResolver = new S3ImageResolver();
    const resolvedImages = await imageResolver.resolveOrderImages({
      id: order.id,
      previewId: order.previewId,
      createdAt: order.createdAt.toISOString(),
      hdImageUrl: order.hdImageUrl || undefined,
      metadata: order.metadata as any,
    });

    // Also try to get preview metadata if available
    const previewMetadata = await imageResolver.getPreviewMetadata(
      order.previewId,
      order.createdAt.toISOString()
    );

    return NextResponse.json({
      orderId: order.id,
      images: resolvedImages,
      previewMetadata,
      s3Available: imageResolver.isS3Available(),
    });

  } catch (error) {
    console.error('Error resolving order images:', error);
    return NextResponse.json(
      { error: 'Failed to resolve images' },
      { status: 500 }
    );
  }
}