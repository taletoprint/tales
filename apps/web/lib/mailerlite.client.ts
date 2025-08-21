import { 
  MailerLiteError, 
  MailerLiteValidationError,
  ZSubscriberResponse,
  ZCreateSubscriberResponse,
  type SubscriberInfo,
  type CreateSubscriberRequest,
  type SubscriberParsed
} from './mailerlite.types';

// Configuration interface
export interface MailerLiteConfig {
  apiKey: string;
  groupId: string;
}

// MailerLite REST API client with proper typing and error handling
export class MailerLiteClient {
  private readonly apiKey: string;
  private readonly groupId: string;
  private readonly baseUrl = 'https://connect.mailerlite.com/api';

  constructor(config: MailerLiteConfig) {
    this.apiKey = config.apiKey;
    this.groupId = config.groupId;
  }

  /**
   * Make authenticated request to MailerLite API with retry logic
   */
  private async makeRequest<T>(
    path: string, 
    init: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const requestInit: RequestInit = {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...(init.headers || {}),
      },
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestInit);
        
        if (!response.ok) {
          const errorText = await response.text();
          
          // Rate limiting - retry with exponential backoff
          if (response.status === 429 && attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            console.warn(`MailerLite rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw new MailerLiteError(
            response.status,
            response.statusText,
            `MailerLite API error: ${errorText}`,
            errorText
          );
        }

        return await response.json() as T;
      } catch (error) {
        if (error instanceof MailerLiteError) {
          throw error; // Re-throw MailerLite errors
        }
        
        // Network errors - retry
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`Network error, retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new MailerLiteError(
          0,
          'NetworkError',
          `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    throw new MailerLiteError(0, 'MaxRetriesExceeded', 'Maximum retries exceeded');
  }

  /**
   * Check if an email exists in the specified group
   */
  async checkEmailExists(email: string): Promise<SubscriberInfo> {
    try {
      const response = await this.makeRequest<unknown>(`/subscribers/${encodeURIComponent(email)}`);
      
      // Validate response with Zod
      const parseResult = ZSubscriberResponse.safeParse(response);
      if (!parseResult.success) {
        throw new MailerLiteValidationError(
          'Invalid subscriber response from MailerLite',
          parseResult.error
        );
      }

      const subscriber = parseResult.data.data;
      
      // Check if subscriber is in our specific group
      const groups = subscriber.groups || [];
      const isInGroup = groups.some(group => group.id === this.groupId);
      
      return {
        email,
        exists: isInGroup,
        subscribedAt: subscriber.date_created,
        status: subscriber.status,
      };
    } catch (error) {
      // MailerLite returns 404 when subscriber doesn't exist
      if (error instanceof MailerLiteError && error.status === 404) {
        return {
          email,
          exists: false,
        };
      }
      
      throw error; // Re-throw other errors
    }
  }

  /**
   * Add a new subscriber to the group with idempotency
   */
  async addSubscriberToGroup(
    email: string, 
    fields?: Record<string, any>
  ): Promise<SubscriberParsed> {
    const requestBody: CreateSubscriberRequest = {
      email,
      groups: [this.groupId],
      fields: fields || {},
      status: 'active',
    };

    // Generate idempotency key to prevent duplicate subscriptions
    const idempotencyKey = `sub-${email}-${this.groupId}`;
    
    const response = await this.makeRequest<unknown>('/subscribers', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });

    // Validate response with Zod
    const parseResult = ZCreateSubscriberResponse.safeParse(response);
    if (!parseResult.success) {
      throw new MailerLiteValidationError(
        'Invalid create subscriber response from MailerLite',
        parseResult.error
      );
    }

    return parseResult.data.data;
  }

  /**
   * Test the MailerLite connection by fetching group information
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest(`/groups/${this.groupId}`);
      return true;
    } catch (error) {
      console.error('MailerLite connection test failed:', error);
      return false;
    }
  }

  /**
   * Get subscriber details (for debugging/admin purposes)
   */
  async getSubscriber(email: string): Promise<SubscriberParsed | null> {
    try {
      const response = await this.makeRequest<unknown>(`/subscribers/${encodeURIComponent(email)}`);
      
      const parseResult = ZSubscriberResponse.safeParse(response);
      if (!parseResult.success) {
        throw new MailerLiteValidationError(
          'Invalid subscriber response from MailerLite',
          parseResult.error
        );
      }

      return parseResult.data.data;
    } catch (error) {
      if (error instanceof MailerLiteError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

// Factory function to create MailerLite client with environment variables
export function createMailerLiteClient(): MailerLiteClient {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;

  if (!apiKey || !groupId) {
    throw new Error('MAILERLITE_API_KEY and MAILERLITE_GROUP_ID environment variables are required');
  }

  return new MailerLiteClient({
    apiKey,
    groupId,
  });
}

// Utility functions for validation (moved from old client)
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

export function isSuspiciousEmail(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  
  const suspiciousPatterns = [
    /test@test\./,
    /fake@fake\./,
    /example@example\./,
    /spam@/,
    /temp@/,
    /@temp\./,
    /@throwaway\./,
    /@10minutemail\./,
    /@guerrillamail\./,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(cleanEmail));
}