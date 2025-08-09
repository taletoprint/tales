import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  
  if (!replicateToken) {
    return NextResponse.json({ error: 'No Replicate token configured' }, { status: 500 });
  }

  try {
    // Check account status
    const response = await fetch('https://api.replicate.com/v1/account', {
      headers: {
        'Authorization': `Token ${replicateToken}`,
      },
    });

    const accountData = await response.json();
    
    return NextResponse.json({
      status: response.status,
      account: accountData,
      hasCredits: response.ok && accountData,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check Replicate account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}