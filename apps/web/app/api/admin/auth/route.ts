import { NextRequest, NextResponse } from 'next/server';
import { getAdminPassword, createAdminSession } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const adminPassword = getAdminPassword();
    
    if (password !== adminPassword) {
      console.log('Admin login attempt with incorrect password');
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create session token
    const sessionToken = createAdminSession();
    
    console.log('Admin authenticated successfully');

    // Set session cookie
    const response = NextResponse.json({ 
      success: true,
      message: 'Authenticated successfully' 
    });
    
    response.cookies.set('taletoprint_admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Logout - clear session cookie
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  
  response.cookies.set('taletoprint_admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}