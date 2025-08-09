// Simple admin authentication system
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'taletoprint_admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface AdminSession {
  authenticated: boolean;
  expiresAt: number;
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'admin123';
}

export function createAdminSession(): string {
  const session: AdminSession = {
    authenticated: true,
    expiresAt: Date.now() + SESSION_DURATION,
  };
  
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

export function validateAdminSession(sessionToken?: string): boolean {
  if (!sessionToken) return false;
  
  try {
    const session: AdminSession = JSON.parse(
      Buffer.from(sessionToken, 'base64').toString('utf8')
    );
    
    return session.authenticated && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return validateAdminSession(sessionCookie);
}

export function requireAdminAuth(request: NextRequest): Response | null {
  if (!isAdminAuthenticated(request)) {
    return Response.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }
  return null;
}

// Helper for API routes
export function withAdminAuth(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const authError = requireAdminAuth(request);
    if (authError) return authError;
    
    return handler(request);
  };
}