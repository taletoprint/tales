import { NextRequest, NextResponse } from 'next/server';
import { ProdigiClient } from '@/lib/prodigi-client';

export async function GET(request: NextRequest) {
  try {
    const prodigiApiKey = process.env.PRODIGI_API_KEY;
    
    if (!prodigiApiKey) {
      return NextResponse.json({ error: 'Prodigi API key not configured' }, { status: 500 });
    }

    console.log('Starting Prodigi SKU validation...');
    const client = new ProdigiClient(prodigiApiKey);
    
    // Test common SKU patterns
    const results = await client.validateCommonSKUs();
    
    // Also test specific quotes for A4 and A3
    const validSKUs = Object.entries(results)
      .filter(([sku, product]) => product !== null)
      .map(([sku, product]) => ({ sku, product }));

    let quoteResults: any = null;
    if (validSKUs.length > 0) {
      try {
        console.log('Getting quotes for valid SKUs...');
        quoteResults = await client.getQuote(
          validSKUs.slice(0, 2).map(({ sku }) => ({ sku, copies: 1 }))
        );
      } catch (error) {
        console.error('Quote request failed:', error);
        quoteResults = { error: 'Quote request failed', details: error.message };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      skuValidation: results,
      validSKUs: validSKUs.map(({ sku, product }) => ({
        sku,
        name: product?.name,
        description: product?.description,
        dimensions: product?.dimensions,
      })),
      quotes: quoteResults,
      recommendations: {
        A4: validSKUs.find(({ sku }) => sku.includes('A4'))?.sku || 'GLOBAL-FAP-A4',
        A3: validSKUs.find(({ sku }) => sku.includes('A3'))?.sku || 'GLOBAL-FAP-A3',
      }
    });

  } catch (error) {
    console.error('SKU validation failed:', error);
    
    return NextResponse.json({
      error: 'SKU validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}