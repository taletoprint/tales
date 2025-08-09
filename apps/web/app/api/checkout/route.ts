import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getProductSpec, PrintSize } from '@/lib/prodigi-client';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { previewData, printSize } = await request.json();
    
    if (!previewData) {
      return NextResponse.json({ error: 'Preview data required' }, { status: 400 });
    }

    // Get product spec for pricing
    const selectedSize: PrintSize = printSize || 'A3';
    const productSpec = getProductSpec(selectedSize);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_creation: 'always', // Create customer even for guest checkout
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: productSpec.name,
              description: `${productSpec.description} - ${previewData.style} style`,
              images: [previewData.imageUrl],
              metadata: {
                previewId: previewData.id,
                style: previewData.style,
                aspect: previewData.aspect,
                printSize: selectedSize,
              },
            },
            unit_amount: productSpec.retailPrice,
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['GB'], // UK only for now
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0, // Free shipping
              currency: 'gbp',
            },
            display_name: 'Free UK Delivery',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 3,
              },
              maximum: {
                unit: 'business_day',
                value: 5,
              },
            },
          },
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?cancelled=true`,
      metadata: {
        previewId: previewData.id,
        previewUrl: previewData.imageUrl,
        story: previewData.prompt,
        style: previewData.style,
        aspect: previewData.aspect,
        printSize: selectedSize,
        refinedPrompt: previewData.refinedPrompt,
      },
    });

    console.log('Stripe checkout session created:', session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
    
    return NextResponse.json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}