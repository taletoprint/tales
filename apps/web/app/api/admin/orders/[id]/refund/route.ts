import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { PrismaClient } from '@taletoprint/database';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

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
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Order already refunded' }, { status: 400 });
    }

    if (!order.stripePaymentId && !order.stripeSessionId) {
      return NextResponse.json({ error: 'No payment information found' }, { status: 400 });
    }

    // Get payment intent from Stripe session
    let paymentIntentId = order.stripePaymentId;
    
    if (!paymentIntentId && order.stripeSessionId) {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      paymentIntentId = session.payment_intent as string;
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent not found' }, { status: 400 });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        metadata: {
          ...(order.metadata || {}),
          refundId: refund.id,
          refundedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Refund processed successfully',
      refundId: refund.id 
    });
  } catch (error) {
    console.error('Order refund error:', error);
    return NextResponse.json(
      { error: 'Refund failed' },
      { status: 500 }
    );
  }
}