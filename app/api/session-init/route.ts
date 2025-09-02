import { NextRequest, NextResponse } from 'next/server';
import { checkSessionInitRateLimit, getClientIP } from '@/lib/rate-limit';
import { RATE_LIMIT_ERRORS } from '@/lib/constants';
import { SignJWT } from 'jose';

// Use a simple secret for JWT signing (in production, use a proper secret)
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_INIT_SECRET || 'your-session-init-secret-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check if VIP user (bypass rate limits)
    const vipSecrets = (process.env.VIP_SECRETS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const vipCookie = request.cookies.get('vip')?.value;
    const isVIP = vipCookie && vipSecrets.includes(vipCookie);

    if (!isVIP) {
      // Check session init rate limit (1 per 5 minutes)
      const rateLimitResult = await checkSessionInitRateLimit(clientIP);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: RATE_LIMIT_ERRORS.SESSION_INIT_EXCEEDED,
            retryAfter: Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.getTime().toString(),
              'Retry-After': Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000).toString()
            }
          }
        );
      }
    }

    // Create session initiation token (30-second expiry)
    const token = await new SignJWT({ 
      ip: clientIP,
      purpose: 'session-init',
      created: Date.now()
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30s')
      .sign(JWT_SECRET);

    return NextResponse.json({
      initToken: token,
      expiresAt: new Date(Date.now() + 30000), // 30 seconds
      message: 'Session initiation token created'
    });

  } catch (error) {
    console.error('Session init error:', error);
    return NextResponse.json(
      { error: 'Failed to create session initiation token' },
      { status: 500 }
    );
  }
}