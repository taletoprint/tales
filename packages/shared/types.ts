export enum ImageOrientation {
  PORTRAIT = 'PORTRAIT',
  LANDSCAPE = 'LANDSCAPE',
  SQUARE = 'SQUARE'
}

export type Aspect = "A3_portrait" | "A3_landscape" | "A2_portrait" | "square";

export interface PreviewResult {
  id: string;
  imageUrl: string;
  prompt: string;
  refinedPrompt: string;
  aspect: Aspect;
  style: string;
  timestamp: number;
  isPreview: boolean;
  expiresAt?: string;
  metadata?: {
    generationTime: number;
    cost: number;
    styleKeywords: string[];
    dimensions: {
      width: number;
      height: number;
    };
  };
}

export interface UserIdentity {
  ip?: string;
  email?: string;
  userId?: string;
}

export interface DailyCostReport {
  previews: number;
  hd: number;
  total: number;
  conversions: number;
}

export interface PrintSize {
  code: 'A3' | 'A2' | 'A4';
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
  price: number;
}

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

export interface PrintReadyImage {
  orderId: string;
  hdUrl: string;
  printFileUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
  colorProfile: string;
}

export interface ProdigiOrder {
  id: string;
  merchantReference: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export interface GenerationLimits {
  daily: {
    anonymous: number;
    registered: number;
    customer: number;
  };
  costs: {
    preview: number;
    hd: number;
    prompt: number;
  };
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}