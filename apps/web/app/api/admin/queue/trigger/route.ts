import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    console.log('[Admin] Manual queue processing triggered');
    
    // Call the S3 upload queue processor
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/queue/process-s3-uploads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Queue processing triggered',
      result
    });

  } catch (error) {
    console.error('[Admin] Queue trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger queue processing' },
      { status: 500 }
    );
  }
}