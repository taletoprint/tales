import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SimpleAIGenerator } from '@/lib/ai-services';
import { PrismaClient } from '@taletoprint/database';
import { getProductSpec, PrintSize } from '@/lib/prodigi-client';
import { PrintFileGenerator } from '@/lib/print-file-generator';
import { S3PrintAssetUploader } from '@/lib/s3-uploader';

// Initialize Stripe and Prisma - Fixed for deployment
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
  const sessionId = session.id;
  console.log(`[WEBHOOK] Processing checkout session: ${sessionId}`);
  console.log(`[WEBHOOK] Session amount: ${session.amount_total} ${session.currency}`);
  console.log(`[WEBHOOK] Payment status: ${session.payment_status}`);

  try {
    // Extract order data from session metadata
    console.log(`[WEBHOOK] Extracting metadata from session...`);
    console.log(`[WEBHOOK] Session metadata:`, JSON.stringify(session.metadata, null, 2));
    
    const {
      previewId,
      previewUrl,
      story,
      style,
      aspect,
      printSize,
      refinedPrompt
    } = session.metadata || {};

    console.log(`[WEBHOOK] Extracted values:`, {
      previewId: previewId ? 'present' : 'missing',
      previewUrl: previewUrl ? 'present' : 'missing',
      story: story ? story.substring(0, 50) + '...' : 'missing',
      style,
      aspect,
      printSize,
      refinedPrompt: refinedPrompt ? 'present' : 'missing'
    });

    if (!previewId || !previewUrl) {
      const error = `Missing required metadata: previewId=${!!previewId}, previewUrl=${!!previewUrl}`;
      console.error(`[WEBHOOK] ${error}`);
      throw new Error(error);
    }

    // Retrieve the full session with customer details
    console.log(`[WEBHOOK] Retrieving full session details...`);
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['customer']
    });
    
    console.log(`[WEBHOOK] Full session retrieved successfully`);
    const customer = fullSession.customer as Stripe.Customer;
    // Shipping details are directly on the session object
    const shipping = fullSession.shipping_details || fullSession.shipping || fullSession.customer_details;
    
    console.log(`[WEBHOOK] Customer:`, customer?.email || session.customer_email || 'no email');
    console.log(`[WEBHOOK] Shipping data:`, shipping ? 'present' : 'missing');
    
    if (!shipping?.address) {
      console.error(`[WEBHOOK] Missing shipping address. Available fields:`, Object.keys(fullSession));
      console.error(`[WEBHOOK] Full session data:`, JSON.stringify(fullSession, null, 2));
      throw new Error('Missing shipping address');
    }
    
    console.log(`[WEBHOOK] Shipping address:`, {
      name: shipping.name,
      city: shipping.address.city,
      country: shipping.address.country,
      postalCode: shipping.address.postal_code
    });

    // Validate required shipping address fields for Prodigi
    const requiredShippingFields = [];
    if (!shipping.name) requiredShippingFields.push('name');
    if (!shipping.address.line1) requiredShippingFields.push('line1');
    if (!shipping.address.city) requiredShippingFields.push('city');
    if (!shipping.address.postal_code) requiredShippingFields.push('postal_code');
    if (!shipping.address.country) requiredShippingFields.push('country');
    
    if (requiredShippingFields.length > 0) {
      const error = `Missing required shipping address fields: ${requiredShippingFields.join(', ')}`;
      console.error(`[WEBHOOK] ${error}`);
      throw new Error(error);
    }
    
    console.log(`[WEBHOOK] Shipping address validation passed`);

    // Database validations before creating order
    console.log(`[WEBHOOK] Performing database validations...`);
    
    // Check if preview exists
    const existingPreview = await prisma.preview.findUnique({
      where: { id: previewId }
    });
    
    if (!existingPreview) {
      const error = `Preview ${previewId} not found in database`;
      console.error(`[WEBHOOK] ${error}`);
      throw new Error(error);
    }
    
    console.log(`[WEBHOOK] Preview ${previewId} validated successfully`);
    
    // Create order record in database
    const orderId = `TTP-${session.id.replace('cs_', '').toUpperCase()}`;
    
    // Check if order already exists (prevent duplicate processing)
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (existingOrder) {
      console.log(`[WEBHOOK] Order ${orderId} already exists with status: ${existingOrder.status}`);
      if (existingOrder.status === 'FAILED') {
        console.log(`[WEBHOOK] Existing order failed, will update and retry processing`);
      } else {
        console.log(`[WEBHOOK] Order already processed successfully, skipping`);
        return;
      }
    }
    
    console.log(`[WEBHOOK] Creating order ${orderId} for customer: ${customer?.email || session.customer_email}`);

    // Get product spec for the selected print size
    const selectedPrintSize: PrintSize = (printSize as PrintSize) || 'A3';
    console.log(`[WEBHOOK] Selected print size: ${selectedPrintSize}`);
    
    const productSpec = getProductSpec(selectedPrintSize);
    console.log(`[WEBHOOK] Product spec:`, {
      prodigiSku: productSpec.prodigiSku,
      retailPrice: productSpec.retailPrice
    });

    // Create or update the order record as PAID
    console.log(`[WEBHOOK] Creating/updating order record in database...`);
    const order = await prisma.order.upsert({
      where: { id: orderId },
      create: {
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
      update: {
        email: customer?.email || session.customer_email || '',
        paymentStatus: 'paid',
        status: 'PAID',
        hdImageUrl: null, // Reset these fields for retry
        printAssetUrl: null,
        prodigiOrderId: null,
        trackingNumber: null,
        metadata: {
          previewUrl,
          story,
          style,
          printSize: selectedPrintSize,
          refinedPrompt,
          retryAttempt: true,
          retryTimestamp: new Date().toISOString()
        },
      },
    });

    console.log(`[WEBHOOK] Order ${orderId} created in database successfully`);

    // Update order status to GENERATING
    console.log(`[WEBHOOK] Updating order status to GENERATING...`);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'GENERATING' },
    });
    console.log(`[WEBHOOK] Order status updated to GENERATING`);

    // Check environment variables before proceeding
    console.log(`[WEBHOOK] Checking environment variables...`);
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsS3Bucket = process.env.AWS_S3_BUCKET;
    const prodigiApiKey = process.env.PRODIGI_API_KEY;
    const databaseUrl = process.env.DATABASE_URL;
    
    console.log(`[WEBHOOK] Environment check:`, {
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
      console.error(`[WEBHOOK] ${error}`);
      throw new Error(error);
    }

    console.log(`[WEBHOOK] Initializing AI generator...`);
    const generator = new SimpleAIGenerator(openaiApiKey!, replicateToken!);
    
    // Create preview result object for HD generation
    console.log(`[WEBHOOK] Creating preview result object for HD generation...`);
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
        dimensions: { width: 1024, height: 1448 },
        model: 'flux-schnell' as 'flux-schnell' | 'sdxl', // Will be determined by the actual generation
        has_people: true // Default for webhook processing
      }
    };

    console.log(`[WEBHOOK] Preview result created:`, {
      id: previewResult.id,
      imageUrl: previewResult.imageUrl ? 'present' : 'missing',
      aspect: previewResult.aspect,
      style: previewResult.style
    });

    console.log(`[WEBHOOK] Starting HD generation for order ${orderId}...`);
    const hdImageUrl = await generator.generateHDPrint(previewResult);
    console.log(`[WEBHOOK] HD image generated successfully: ${hdImageUrl}`);

    // Generate print-ready file with borders
    console.log(`[WEBHOOK] Creating print-ready file for ${selectedPrintSize}...`);
    const printGenerator = new PrintFileGenerator();
    const printFile = await printGenerator.generatePrintFile(
      hdImageUrl,
      { printSize: selectedPrintSize },
      orderId
    );
    console.log(`[WEBHOOK] Print file generated:`, {
      filename: printFile.filename,
      bufferSize: printFile.buffer.length,
      dimensions: `${printFile.width}x${printFile.height}`
    });

    // Upload print-ready file to S3
    console.log(`[WEBHOOK] Uploading print-ready file to S3...`);
    const s3Uploader = new S3PrintAssetUploader();
    const s3Upload = await s3Uploader.uploadPrintAsset(
      printFile.buffer,
      printFile.filename,
      orderId
    );
    console.log(`[WEBHOOK] S3 upload successful:`, {
      key: s3Upload.key,
      signedUrl: s3Upload.signedUrl ? 'present' : 'missing'
    });

    // Update order with HD image URL and S3 asset URL, mark as AWAITING_APPROVAL
    console.log(`[WEBHOOK] Updating order with final URLs and status...`);
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        hdImageUrl,
        printAssetUrl: s3Upload.signedUrl, // Signed URL for Prodigi
        status: 'AWAITING_APPROVAL', // Manual approval required
      },
    });

    console.log(`[WEBHOOK] Order ${orderId} processed successfully and is awaiting manual approval`);
    
    // TODO: Send notification to admin about new order requiring approval

    // TODO: Send confirmation email to customer

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const stackTrace = error instanceof Error ? error.stack : 'No stack trace';
    
    console.error(`[WEBHOOK] Error processing checkout session ${sessionId}:`, errorMessage);
    console.error(`[WEBHOOK] Stack trace:`, stackTrace);
    
    // Try to update order status to FAILED if we have an order ID
    const orderId = `TTP-${session.id.replace('cs_', '').toUpperCase()}`;
    try {
      console.log(`[WEBHOOK] Attempting to mark order ${orderId} as FAILED...`);
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'FAILED',
          metadata: {
            error: errorMessage,
            timestamp: new Date().toISOString()
          }
        },
      });
      console.log(`[WEBHOOK] Order ${orderId} marked as FAILED successfully`);
    } catch (dbError) {
      console.error(`[WEBHOOK] Failed to update order status to FAILED:`, dbError);
    }
    
    // Don't rethrow - we want to return 200 to Stripe to avoid retries
    // TODO: Add retry logic and error notifications
    console.error(`[WEBHOOK] Webhook processing failed but returning success to prevent Stripe retries`);
    console.error(`[WEBHOOK] Order ${orderId} can be retried manually from admin panel`);
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