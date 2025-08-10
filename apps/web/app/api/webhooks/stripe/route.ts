import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SimpleAIGenerator } from '@/lib/ai-services';
import { PrismaClient } from '@taletoprint/database';
import { getProductSpec, PrintSize } from '@/lib/prodigi-client';
import { PrintFileGenerator } from '@/lib/print-file-generator';
import { S3PrintAssetUploader } from '@/lib/s3-uploader';

// Initialize Stripe and Prisma
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});
const prisma = new PrismaClient();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout session:', session.id);

  try {
    // Extract order data from session metadata
    const {
      previewId,
      previewUrl,
      story,
      style,
      aspect,
      printSize,
      refinedPrompt
    } = session.metadata || {};

    if (!previewId || !previewUrl) {
      throw new Error('Missing required metadata in checkout session');
    }

    // Retrieve customer and shipping details
    const customer = session.customer as Stripe.Customer;
    
    // Get full session details with expanded data
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['customer', 'shipping_details']
    });
    
    const shipping = fullSession.shipping_details || (fullSession as any).shipping;
    
    if (!shipping?.address) {
      console.error('Missing shipping address in session:', JSON.stringify(fullSession, null, 2));
      throw new Error('Missing shipping address');
    }

    // Create order record in database
    const orderId = `TTP-${session.id.replace('cs_', '').toUpperCase()}`;
    
    console.log(`Creating order ${orderId} for customer: ${customer?.email || session.customer_email}`);

    // Get product spec for the selected print size
    const selectedPrintSize: PrintSize = (printSize as PrintSize) || 'A3';
    const productSpec = getProductSpec(selectedPrintSize);

    // First, create the order record as PAID
    const order = await prisma.order.create({
      data: {
        id: orderId,
        email: customer?.email || session.customer_email || '',
        previewId,
        size: aspect || 'A3', // Keep for backward compatibility
        printSize: selectedPrintSize, // New field
        price: session.amount_total || productSpec.retailPrice,
        currency: (session.currency || 'gbp').toUpperCase(),
        stripeSessionId: session.id,
        paymentStatus: 'paid',
        status: 'PAID',
        prodigiSku: productSpec.prodigiSku, // Store the SKU to use
        shippingAddress: {
          name: shipping.name,
          line1: shipping.address.line1,
          line2: shipping.address.line2,
          city: shipping.address.city,
          postalCode: shipping.address.postal_code,
          country: shipping.address.country,
        },
        metadata: {
          previewUrl,
          story,
          style,
          printSize: selectedPrintSize,
          refinedPrompt,
        },
      },
    });

    console.log(`Order ${orderId} created in database`);

    // Update order status to GENERATING
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'GENERATING' },
    });

    // Generate HD print version
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    
    if (!openaiApiKey || !replicateToken) {
      throw new Error('Missing AI service API keys');
    }

    const generator = new SimpleAIGenerator(openaiApiKey, replicateToken);
    
    // Create preview result object for HD generation
    const previewResult = {
      id: previewId,
      imageUrl: previewUrl,
      prompt: story || 'Custom artwork',
      refinedPrompt: refinedPrompt || story || 'Custom artwork',
      aspect: aspect as any || 'A3_landscape',
      style: style as any || 'watercolour',
      timestamp: Date.now(),
      isPreview: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      metadata: {
        generationTime: 0,
        cost: 0.002,
        styleKeywords: [style || 'watercolour'],
        dimensions: { width: 1024, height: 1448 }
      }
    };

    console.log(`Generating HD version for order ${orderId}...`);
    const hdImageUrl = await generator.generateHDPrint(previewResult);
    console.log(`HD image generated: ${hdImageUrl}`);

    // Generate print-ready file with borders
    console.log(`Creating print-ready file for ${selectedPrintSize}...`);
    const printGenerator = new PrintFileGenerator();
    const printFile = await printGenerator.generatePrintFile(
      hdImageUrl,
      { printSize: selectedPrintSize },
      orderId
    );

    // Upload print-ready file to S3
    console.log(`Uploading print-ready file to S3...`);
    const s3Uploader = new S3PrintAssetUploader();
    const s3Upload = await s3Uploader.uploadPrintAsset(
      printFile.buffer,
      printFile.filename,
      orderId
    );

    // Update order with HD image URL and S3 asset URL, mark as PRINT_READY
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        hdImageUrl,
        printAssetUrl: s3Upload.signedUrl, // Signed URL for Prodigi
        status: 'PRINT_READY',
      },
    });

    // Get the full order for Prodigi submission
    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!fullOrder) {
      throw new Error(`Order ${orderId} not found after creation`);
    }

    // Send to Prodigi for fulfillment using the print-ready asset
    const prodigiOrderId = await submitToProdigiForFulfillment(fullOrder, s3Upload.signedUrl);

    // Update order with Prodigi order ID and mark as PRINTING
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        prodigiOrderId,
        status: 'PRINTING',
      },
    });

    console.log(`Order ${orderId} processed successfully and sent to Prodigi (${prodigiOrderId})`);

    // TODO: Send confirmation email to customer

  } catch (error) {
    console.error('Error processing checkout session:', error);
    
    // Try to update order status to FAILED if we have an order ID
    const orderId = `TTP-${session.id.replace('cs_', '').toUpperCase()}`;
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'FAILED' },
      });
      console.log(`Order ${orderId} marked as FAILED`);
    } catch (dbError) {
      console.error('Failed to update order status to FAILED:', dbError);
    }
    
    // Don't rethrow - we want to return 200 to Stripe to avoid retries
    // TODO: Add retry logic and error notifications
    console.error('Webhook processing failed but returning success to prevent retries');
  }
}

async function submitToProdigiForFulfillment(order: any, printAssetUrl: string): Promise<string> {
  const prodigiApiKey = process.env.PRODIGI_API_KEY;
  // Use the SKU stored in the order, fallback to default
  const prodigiSku = order.prodigiSku || process.env.PRODIGI_DEFAULT_SKU || 'GLOBAL-FAP-A3';

  if (!prodigiApiKey) {
    console.error('Missing Prodigi API key');
    throw new Error('Print fulfillment not configured');
  }

  try {
    console.log(`Submitting order ${order.id} to Prodigi for fulfillment...`);

    // Parse shipping address from JSON
    const shippingAddress = typeof order.shippingAddress === 'string' 
      ? JSON.parse(order.shippingAddress) 
      : order.shippingAddress;

    // Create Prodigi order
    const prodigiOrder = {
      merchantReference: order.id,
      shippingMethod: 1, // Standard shipping
      recipient: {
        name: shippingAddress.name || 'Customer',
        email: order.email,
        address: {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || '',
          postalOrZipCode: shippingAddress.postalCode,
          countryCode: shippingAddress.country,
          townOrCity: shippingAddress.city,
        },
      },
      items: [
        {
          merchantReference: `${order.id}-print`,
          sku: prodigiSku,
          copies: 1,
          assets: [
            {
              printArea: 'default',
              url: printAssetUrl,
              sizing: 'fill', // Important: use 'fill' since we pre-sized with borders
            },
          ],
        },
      ],
    };

    const response = await fetch('https://api.prodigi.com/v4.0/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${prodigiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prodigiOrder),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Prodigi API error ${response.status}:`, errorText);
      throw new Error(`Prodigi fulfillment failed: ${response.status} - ${errorText}`);
    }

    const prodigiResponse = await response.json();
    console.log(`Prodigi order created successfully:`, prodigiResponse.id);

    return prodigiResponse.id;

  } catch (error) {
    console.error('Prodigi fulfillment error:', error);
    throw error;
  }
}