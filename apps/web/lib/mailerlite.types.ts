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
  name: z.string(),
});

export const ZMailerLiteSubscriber = z.object({
  id: z.string(),
  email: z.string().email(),
  status: z.enum(['active', 'unsubscribed', 'junk', 'unconfirmed']),
  date_created: z.string(),
  groups: z.array(ZMailerLiteGroup).optional(),
});

export const ZSubscriberResponse = z.object({
  data: ZMailerLiteSubscriber,
});

export const ZCreateSubscriberResponse = z.object({
  data: ZMailerLiteSubscriber,
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