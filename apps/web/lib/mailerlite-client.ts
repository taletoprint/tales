import { MailerLite } from '@mailerlite/mailerlite-nodejs';

export interface MailerLiteConfig {
  apiKey: string;
  groupId: string;
}

export interface SubscriberInfo {
  email: string;
  exists: boolean;
  subscribedAt?: string;
  status?: 'active' | 'unsubscribed' | 'junk' | 'unconfirmed';
}

export class MailerLiteService {
  private client: MailerLite;
  private groupId: string;

  constructor(config: MailerLiteConfig) {
    this.client = new MailerLite({
      api_key: config.apiKey,
    });
    this.groupId = config.groupId;
  }

  /**
   * Check if an email exists in the specified group
   */
  async checkEmailExists(email: string): Promise<SubscriberInfo> {
    try {
      // First, try to get the subscriber by email
      const response = await this.client.subscribers.find(email);
      
      if (response && response.data) {
        const subscriber = response.data;
        
        // Check if subscriber is in our specific group
        const groups = subscriber.groups || [];
        const isInGroup = groups.some((group: any) => group.id === this.groupId);
        
        return {
          email,
          exists: isInGroup,
          subscribedAt: subscriber.date_created,
          status: subscriber.status as any,
        };
      }
      
      return {
        email,
        exists: false,
      };
    } catch (error: any) {
      // MailerLite returns 404 when subscriber doesn't exist
      if (error.status === 404 || error.response?.status === 404) {
        return {
          email,
          exists: false,
        };
      }
      
      console.error('MailerLite API error checking email:', error);
      throw new Error(`Failed to check email in MailerLite: ${error.message}`);
    }
  }

  /**
   * Add a new subscriber to the group
   */
  async addSubscriberToGroup(email: string, fields?: Record<string, any>): Promise<boolean> {
    try {
      const subscriberData = {
        email,
        groups: [this.groupId],
        fields: fields || {},
        status: 'active' as const,
      };

      const response = await this.client.subscribers.createOrUpdate(subscriberData);
      
      if (response && response.data) {
        console.log(`Successfully added ${email} to MailerLite group ${this.groupId}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('MailerLite API error adding subscriber:', error);
      throw new Error(`Failed to add subscriber to MailerLite: ${error.message}`);
    }
  }

  /**
   * Get subscriber details including custom fields
   */
  async getSubscriber(email: string): Promise<any> {
    try {
      const response = await this.client.subscribers.find(email);
      return response?.data || null;
    } catch (error: any) {
      if (error.status === 404 || error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update subscriber with custom fields
   */
  async updateSubscriberFields(email: string, fields: Record<string, any>): Promise<boolean> {
    try {
      const response = await this.client.subscribers.createOrUpdate({
        email,
        fields,
      });
      
      return !!(response && response.data);
    } catch (error: any) {
      console.error('MailerLite API error updating subscriber:', error);
      throw new Error(`Failed to update subscriber in MailerLite: ${error.message}`);
    }
  }

  /**
   * Test the MailerLite connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to get group info to test connection
      const response = await this.client.groups.find(this.groupId);
      return !!(response && response.data);
    } catch (error) {
      console.error('MailerLite connection test failed:', error);
      return false;
    }
  }
}

// Factory function to create MailerLite service with environment variables
export function createMailerLiteService(): MailerLiteService {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;

  if (!apiKey || !groupId) {
    throw new Error('MAILERLITE_API_KEY and MAILERLITE_GROUP_ID environment variables are required');
  }

  return new MailerLiteService({
    apiKey,
    groupId,
  });
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

// Check for suspicious email patterns
export function isSuspiciousEmail(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  
  // Check for obvious fake patterns
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