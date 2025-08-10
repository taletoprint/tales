import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { PrismaClient } from '@taletoprint/database';

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

    if (order.status !== 'AWAITING_APPROVAL') {
      return NextResponse.json({ error: 'Order is not awaiting approval' }, { status: 400 });
    }

    if (!order.printAssetUrl) {
      return NextResponse.json({ error: 'No print asset available for approval' }, { status: 400 });
    }

    // Update order status to PRINT_READY
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PRINT_READY' },
    });

    // Submit to Prodigi for fulfillment
    const prodigiOrderId = await submitToProdigiForFulfillment(order, order.printAssetUrl);

    // Update order with Prodigi order ID and mark as PRINTING
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        prodigiOrderId,
        status: 'PRINTING',
      },
    });

    console.log(`Order ${orderId} approved and sent to Prodigi (${prodigiOrderId})`);

    return NextResponse.json({ 
      success: true, 
      message: 'Order approved and sent to Prodigi',
      prodigiOrderId 
    });

  } catch (error) {
    console.error('Order approval error:', error);
    return NextResponse.json(
      { error: 'Approval failed' },
      { status: 500 }
    );
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