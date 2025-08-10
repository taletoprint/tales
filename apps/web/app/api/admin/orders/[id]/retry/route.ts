import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { PrismaClient, OrderStatus } from '@taletoprint/database';

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

    if (order.status === 'DELIVERED' || order.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Cannot retry completed orders' }, { status: 400 });
    }

    // Reset order to PAID status to trigger reprocessing
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        hdImageUrl: null,
        printAssetUrl: null,
        prodigiOrderId: null,
        trackingNumber: null,
      },
    });

    // Trigger reprocessing by simulating webhook
    const mockSession = {
      id: order.stripeSessionId,
      customer_email: order.email,
      amount_total: order.price,
      currency: order.currency.toLowerCase(),
      shipping_details: {
        name: order.shippingAddress?.name,
        address: order.shippingAddress,
      },
      metadata: {
        previewId: order.previewId,
        previewUrl: order.preview?.imageUrl,
        story: order.preview?.story,
        style: order.preview?.style,
        printSize: order.printSize,
      },
    };

    // Process in background
    fetch('/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: mockSession },
      }),
    }).catch(console.error);

    return NextResponse.json({ success: true, message: 'Order retry initiated' });
  } catch (error) {
    console.error('Order retry error:', error);
    return NextResponse.json(
      { error: 'Retry failed' },
      { status: 500 }
    );
  }
}