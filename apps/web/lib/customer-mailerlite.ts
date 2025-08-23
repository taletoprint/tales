import { MailerLiteClient } from './mailerlite.client';
import { MailerLiteError } from './mailerlite.types';

export interface OrderMetadata {
  orderId: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  printSize: string;
  artStyle: string;
  shippingCountry?: string;
  shippingCity?: string;
  firstOrder?: boolean;
}

export interface CustomerEmailOptions {
  email: string;
  customerName?: string;
  orderMetadata: OrderMetadata;
}

/**
 * Add a customer to the customers MailerLite group after order completion
 */
export async function addCustomerToMailerLite(
  options: CustomerEmailOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if customers group ID is configured
    const customersGroupId = process.env.MAILERLITE_CUSTOMERS_GROUP_ID;
    if (!customersGroupId) {
      console.warn('MAILERLITE_CUSTOMERS_GROUP_ID not configured, skipping customer email addition');
      return { success: false, error: 'Customer group not configured' };
    }

    // Create MailerLite client with customers group ID
    const client = new MailerLiteClient({
      apiKey: process.env.MAILERLITE_API_KEY!,
      groupId: customersGroupId,
    });

    // Check if customer already exists in the group
    const existingCustomer = await client.checkEmailExists(options.email);
    
    // Prepare customer metadata for MailerLite custom fields
    const customerFields = {
      // Order information
      last_order_id: options.orderMetadata.orderId,
      last_order_date: options.orderMetadata.orderDate,
      last_order_amount: options.orderMetadata.totalAmount,
      last_order_currency: options.orderMetadata.currency,
      last_print_size: options.orderMetadata.printSize,
      last_art_style: options.orderMetadata.artStyle,
      
      // Shipping information
      shipping_country: options.orderMetadata.shippingCountry || '',
      shipping_city: options.orderMetadata.shippingCity || '',
      
      // Customer status
      source: 'order_completion',
      customer_since: existingCustomer.exists ? existingCustomer.subscribedAt : options.orderMetadata.orderDate,
      is_repeat_customer: existingCustomer.exists,
      
      // Order counts (we'll increment if they already exist)
      total_orders: existingCustomer.exists ? undefined : 1, // Let MailerLite handle increment logic
      
      // Customer name if provided
      ...(options.customerName && { customer_name: options.customerName }),
    };

    if (existingCustomer.exists) {
      // Customer already exists - update their information with latest order
      console.log(`Updating existing customer ${options.email} with new order ${options.orderMetadata.orderId}`);
      
      // Get current customer data to preserve existing fields
      const currentCustomer = await client.getSubscriber(options.email);
      
      await client.updateSubscriberFields(options.email, customerFields);
    } else {
      // New customer - add to the group
      console.log(`Adding new customer ${options.email} to MailerLite customers group`);
      
      await client.addSubscriberToGroup(options.email, customerFields);
    }

    console.log(`Successfully processed customer ${options.email} in MailerLite customers group`);
    return { success: true };

  } catch (error) {
    console.error('Failed to add customer to MailerLite:', error);

    // Handle specific MailerLite errors gracefully
    if (error instanceof MailerLiteError) {
      if (error.status === 429) {
        return { success: false, error: 'Rate limited' };
      }
      if (error.status >= 400 && error.status < 500) {
        return { success: false, error: 'Invalid request' };
      }
    }

    return { success: false, error: 'Service error' };
  }
}

/**
 * Update existing MailerLite client to support customers group
 */
export function createCustomersMailerLiteClient(): MailerLiteClient | null {
  const customersGroupId = process.env.MAILERLITE_CUSTOMERS_GROUP_ID;
  const apiKey = process.env.MAILERLITE_API_KEY;

  if (!customersGroupId || !apiKey) {
    return null;
  }

  return new MailerLiteClient({
    apiKey,
    groupId: customersGroupId,
  });
}