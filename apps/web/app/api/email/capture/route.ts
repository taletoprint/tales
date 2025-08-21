import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  createMailerLiteClient, 
  isValidEmail, 
  isSuspiciousEmail 
} from '@/lib/mailerlite.client';
import { 
  MailerLiteError, 
  MailerLiteValidationError 
} from '@/lib/mailerlite.types';
import { resetDailyAttempts } from '@/lib/preview-counter';

// Rate limiting for email submissions (prevent spam)
const emailSubmissionAttempts = new Map<string, { count: number; resetAt: Date }>();
const MAX_EMAIL_ATTEMPTS = 3; // Max 3 email submissions per IP per hour
const EMAIL_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

const requestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_EMAIL', 
          message: validation.error.issues[0]?.message || 'Invalid email format' 
        },
        { status: 400 }
      );
    }
    
    const { email } = validation.data;
    const cleanEmail = email.trim().toLowerCase();

    // Additional email validation
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_EMAIL', 
          message: 'Please enter a valid email address' 
        },
        { status: 400 }
      );
    }

    // Check for suspicious email patterns
    if (isSuspiciousEmail(cleanEmail)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_EMAIL', 
          message: 'Please use a valid email address' 
        },
        { status: 400 }
      );
    }

    // Get user IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check email submission rate limit
    const now = new Date();
    const ipKey = `email_${ip}`;
    const ipAttempts = emailSubmissionAttempts.get(ipKey);
    
    if (ipAttempts && ipAttempts.resetAt > now) {
      if (ipAttempts.count >= MAX_EMAIL_ATTEMPTS) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'RATE_LIMITED', 
            message: 'Too many attempts. Please try again later.' 
          },
          { status: 429 }
        );
      }
      ipAttempts.count++;
    } else {
      emailSubmissionAttempts.set(ipKey, {
        count: 1,
        resetAt: new Date(now.getTime() + EMAIL_RATE_WINDOW),
      });
    }

    // Initialize MailerLite client
    let mailerLiteClient;
    try {
      mailerLiteClient = createMailerLiteClient();
    } catch (error: any) {
      console.error('MailerLite configuration error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'SERVICE_UNAVAILABLE', 
          message: 'Email service temporarily unavailable' 
        },
        { status: 503 }
      );
    }

    // Check if email already exists in MailerLite group and add if not
    try {
      const subscriberInfo = await mailerLiteClient.checkEmailExists(cleanEmail);
      
      if (subscriberInfo.exists) {
        // Email already exists in group - don't give bonus previews again
        return NextResponse.json(
          { 
            success: false, 
            error: 'ALREADY_SUBSCRIBED', 
            message: 'This email is already signed up. Each email can only be used once.' 
          },
          { status: 409 }
        );
      }

      // Add new subscriber to MailerLite group with metadata
      const subscriber = await mailerLiteClient.addSubscriberToGroup(cleanEmail, {
        source: 'free_previews_gate',
        signup_ip: ip,
        signup_date: new Date().toISOString(),
        bonus_previews_granted: 3,
      });

      // Success! Reset the user's daily attempts to give them bonus previews
      console.log(`Email capture successful: ${cleanEmail} (${subscriber.id}) added to MailerLite group`);

      return NextResponse.json({
        success: true,
        message: 'Thank you! You now have 3 additional free previews.',
        bonusPreviewsGranted: 3,
        resetCounter: true, // Signal to client to reset counter
      });

    } catch (error: any) {
      console.error('MailerLite operation failed:', error);
      
      // Handle specific MailerLite errors
      if (error instanceof MailerLiteError) {
        // Rate limiting
        if (error.status === 429) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'RATE_LIMITED', 
              message: 'Too many requests. Please try again later.' 
            },
            { status: 429 }
          );
        }
        
        // Other API errors
        return NextResponse.json(
          { 
            success: false, 
            error: 'SERVICE_ERROR', 
            message: 'Unable to process your signup right now. Please try again later.' 
          },
          { status: 503 }
        );
      }
      
      // Handle validation errors
      if (error instanceof MailerLiteValidationError) {
        console.error('MailerLite response validation failed:', error.zodError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'SERVICE_ERROR', 
            message: 'Unexpected response from email service. Please try again.' 
          },
          { status: 503 }
        );
      }

      throw error; // Re-throw unexpected errors
    }

  } catch (error) {
    console.error('Email capture error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'INTERNAL_ERROR', 
        message: 'Something went wrong. Please try again.' 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint for MailerLite integration
export async function GET(request: NextRequest) {
  // Admin-only health check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const mailerLiteClient = createMailerLiteClient();
    const isConnected = await mailerLiteClient.testConnection();
    
    return NextResponse.json({
      status: isConnected ? 'healthy' : 'unhealthy',
      service: 'mailerlite',
      groupId: process.env.MAILERLITE_GROUP_ID,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      service: 'mailerlite',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}