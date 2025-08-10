// Prodigi API client for SKU validation and order management
import { Aspect } from './types';

export interface ProdigiProduct {
  sku: string;
  name: string;
  description: string;
  dimensions: {
    width: number;
    height: number;
    unit: 'mm' | 'inch';
  };
  printArea: {
    width: number;
    height: number;
    unit: 'mm' | 'inch';
  };
  cost?: number;
}

export interface ProdigiOrderItem {
  sku: string;
  copies: number;
  assets: Array<{
    printArea: string;
    url: string;
    sizing: 'fill' | 'fit';
  }>;
  attributes?: Record<string, any>;
}

export interface ProdigiOrder {
  merchantReference: string;
  shippingMethod: string;
  recipient: {
    name: string;
    email: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      countryCode: string;
    };
  };
  items: ProdigiOrderItem[];
}

export class ProdigiClient {
  private apiKey: string;
  private baseUrl = 'https://api.prodigi.com/v4.0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Test if a SKU exists and get its details
  async getProduct(sku: string): Promise<ProdigiProduct | null> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${sku}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Prodigi API error: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      return {
        sku: data.sku,
        name: data.name,
        description: data.description,
        dimensions: data.dimensions,
        printArea: data.printArea,
      };
    } catch (error) {
      console.error(`Failed to get product ${sku}:`, error);
      return null;
    }
  }

  // Get quote for specific products to understand pricing
  async getQuote(items: Array<{ sku: string; copies: number }>, countryCode = 'GB'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shippingMethod: 'standard',
          destinationCountryCode: countryCode,
          currencyCode: 'GBP',
          items: items.map(item => ({
            sku: item.sku,
            copies: item.copies,
            attributes: {},
            assets: [{ printArea: 'default' }]
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Quote API error: ${response.status} - ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get quote:', error);
      throw error;
    }
  }

  // Create order with Prodigi
  async createOrder(order: ProdigiOrder): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order creation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Failed to create Prodigi order:', error);
      throw error;
    }
  }

  // Test common SKU patterns for fine art prints
  async validateCommonSKUs(): Promise<Record<string, ProdigiProduct | null>> {
    const testSKUs = [
      'GLOBAL-FAP-A4',
      'GLOBAL-FAP-A3', 
      'GLOBAL-FAP-8X11',
      'GLOBAL-FAP-11X16',
      'GLOBAL-FAP-12X16',
      'GLOBAL-FAP-16X20',
      'FINEART_A4_MATTE',
      'FINEART_A3_MATTE',
    ];

    const results: Record<string, ProdigiProduct | null> = {};
    
    for (const sku of testSKUs) {
      console.log(`Testing SKU: ${sku}`);
      results[sku] = await this.getProduct(sku);
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }
}

// Product mapping based on expert recommendations
export type PrintSize = 'A4' | 'A3' | 'SQUARE_8X8' | 'SQUARE_10X10';

export interface ProductSpec {
  id: string;
  name: string;
  size: PrintSize;
  dimensions: { width: number; height: number; unit: 'mm' };
  printPixels: { width: number; height: number }; // 300 DPI with border
  prodigiSku: string;
  retailPrice: number; // in pence
  description: string;
}

export const PRODUCT_CATALOG: Record<PrintSize, ProductSpec> = {
  A4: {
    id: 'poster_a4_matte',
    name: 'A4 Fine Art Print',
    size: 'A4',
    dimensions: { width: 210, height: 297, unit: 'mm' },
    printPixels: { width: 2480, height: 3508 }, // 300 DPI + border
    prodigiSku: 'GLOBAL-FAP-A4', // To be validated
    retailPrice: 3999, // £39.99
    description: 'Premium matte fine art print on archival paper (≥200gsm)'
  },
  A3: {
    id: 'poster_a3_matte',
    name: 'A3 Fine Art Print', 
    size: 'A3',
    dimensions: { width: 297, height: 420, unit: 'mm' },
    printPixels: { width: 3508, height: 4960 }, // 300 DPI + border
    prodigiSku: 'GLOBAL-FAP-A3', // To be validated
    retailPrice: 5999, // £59.99
    description: 'Premium matte fine art print on archival paper (≥200gsm)'
  },
  SQUARE_8X8: {
    id: 'poster_square_8x8_matte',
    name: '8×8" Square Print',
    size: 'SQUARE_8X8',
    dimensions: { width: 203, height: 203, unit: 'mm' }, // 8×8 inches
    printPixels: { width: 2400, height: 2400 }, // 300 DPI + border
    prodigiSku: 'GLOBAL-FAP-8X8', // To be validated
    retailPrice: 3499, // £34.99
    description: 'Premium square matte print on archival paper (≥200gsm)'
  },
  SQUARE_10X10: {
    id: 'poster_square_10x10_matte',
    name: '10×10" Square Print',
    size: 'SQUARE_10X10', 
    dimensions: { width: 254, height: 254, unit: 'mm' }, // 10×10 inches
    printPixels: { width: 3000, height: 3000 }, // 300 DPI + border
    prodigiSku: 'GLOBAL-FAP-10X10', // To be validated
    retailPrice: 4499, // £44.99
    description: 'Premium large square matte print on archival paper (≥200gsm)'
  }
};

// Helper function to get product spec by size
export function getProductSpec(size: PrintSize): ProductSpec {
  return PRODUCT_CATALOG[size];
}

// Helper to map aspect ratio and user choice to print size
export function choosePrintSize(aspect: Aspect, preferredSize?: PrintSize): PrintSize {
  // If user explicitly chooses, honor it
  if (preferredSize) return preferredSize;
  
  // Default logic: squares and portraits default to A4, landscapes to A3
  if (aspect === 'square' || aspect === 'A3_portrait') return 'A4';
  return 'A3';
}