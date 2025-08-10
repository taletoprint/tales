import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'shipping_details', 'line_items'],
    });

    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Invalid or unpaid session' }, { status: 400 });
    }

    // Calculate estimated delivery (3-5 business days from now)
    const now = new Date();
    const deliveryStart = new Date(now);
    const deliveryEnd = new Date(now);
    
    // Add business days (skip weekends)
    let daysAdded = 0;
    while (daysAdded < 3) {
      deliveryStart.setDate(deliveryStart.getDate() + 1);
      if (deliveryStart.getDay() !== 0 && deliveryStart.getDay() !== 6) { // Not Sunday or Saturday
        daysAdded++;
      }
    }
    
    daysAdded = 0;
    while (daysAdded < 5) {
      deliveryEnd.setDate(deliveryEnd.getDate() + 1);
      if (deliveryEnd.getDay() !== 0 && deliveryEnd.getDay() !== 6) { // Not Sunday or Saturday
        daysAdded++;
      }
    }

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    };

    const estimatedDelivery = `${formatDate(deliveryStart)} - ${formatDate(deliveryEnd)}`;

    // Extract customer and shipping details
    const customer = session.customer as Stripe.Customer;
    const shipping = session.shipping_details!;
    
    const orderDetails = {
      id: session.id.replace('cs_', 'TTP-').toUpperCase(),
      customerName: shipping.name || customer?.name || 'Customer',
      customerEmail: customer?.email || session.customer_email,
      shippingAddress: {
        line1: shipping.address?.line1 || '',
        line2: shipping.address?.line2 || '',
        city: shipping.address?.city || '',
        postal_code: shipping.address?.postal_code || '',
        country: shipping.address?.country || 'GB',
      },
      artworkDetails: {
        style: session.metadata?.style || 'watercolour',
        aspect: session.metadata?.aspect || 'A3_landscape',
        story: session.metadata?.story || 'Custom artwork',
      },
      estimatedDelivery,
    };

    console.log('Order details retrieved for session:', sessionId);

    return NextResponse.json({
      success: true,
      order: orderDetails,
    });

  } catch (error) {
    console.error('Failed to retrieve order details:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve order details',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}