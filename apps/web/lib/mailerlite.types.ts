import { z } from 'zod';

// MailerLite API response types - minimal, focused on what we actually use
export type SubscriberStatus = 'active' | 'unsubscribed' | 'junk' | 'unconfirmed';

export interface MailerLiteGroup {
  id: string;
  name: string;
}

export interface MailerLiteSubscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  date_created: string; // ISO datetime
  groups?: MailerLiteGroup[];
}

export interface SubscriberInfo {
  email: string;
  exists: boolean;
  subscribedAt?: string;
  status?: SubscriberStatus;
}

export interface CreateSubscriberRequest {
  email: string;
  groups: string[];
  fields?: Record<string, any>;
  status?: SubscriberStatus;
}

// Zod schemas for runtime validation and type safety
export const ZMailerLiteGroup = z.object({
  id: z.string(),
  name: z.string().optional(),
});

// Raw MailerLite API response structure
const ZSubscriberAPI = z.object({
  id: z.string(),
  email: z.string().email(),
  status: z.enum(['active', 'unsubscribed', 'junk', 'unconfirmed']),
  // MailerLite uses created_at/subscribed_at; legacy date_created sometimes null
  created_at: z.string().optional(),
  subscribed_at: z.string().optional(),
  date_created: z.union([z.string(), z.null()]).optional(),
  groups: z.array(ZMailerLiteGroup).optional(),
});

export const ZSubscriberResponse = z.object({
  data: ZSubscriberAPI,
});

export const ZCreateSubscriberResponse = z.object({
  data: ZSubscriberAPI,
});

export const ZSubscriberListResponse = z.object({
  data: z.array(ZSubscriberAPI),
});

// Parsed types from Zod schemas
export type SubscriberAPI = z.infer<typeof ZSubscriberAPI>;

// Normalized subscriber after parsing MailerLite response
export const ZMailerLiteSubscriber = z.object({
  id: z.string(),
  email: z.string().email(),
  status: z.enum(['active', 'unsubscribed', 'junk', 'unconfirmed']),
  date_created: z.string().optional(),
  groups: z.array(ZMailerLiteGroup),
});

// Parsed types from Zod schemas
export type SubscriberParsed = z.infer<typeof ZMailerLiteSubscriber>;
export type SubscriberResponseParsed = z.infer<typeof ZSubscriberResponse>;

// Error types for better error handling
export class MailerLiteError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public response?: any
  ) {
    super(message);
    this.name = 'MailerLiteError';
  }
}

export class MailerLiteValidationError extends Error {
  constructor(message: string, public zodError: z.ZodError) {
    super(message);
    this.name = 'MailerLiteValidationError';
  }
}

/**
 * Normalize MailerLite API response to consistent format
 */
export function normalizeSubscriber(api: SubscriberAPI): SubscriberParsed {
  // Prefer modern fields, fallback if needed
  const date_created = 
    api.created_at ??
    api.subscribed_at ??
    (typeof api.date_created === 'string' ? api.date_created : undefined);

  return {
    id: api.id,
    email: api.email,
    status: api.status,
    date_created,
    groups: api.groups ?? [],
  };
}