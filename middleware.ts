import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkAPIRateLimit, getClientIP } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip rate limiting for session endpoint (needed for auth)
  if (request.nextUrl.pathname === '/api/session') {
    return NextResponse.next();
  }

  try {
    const ip = getClientIP(request);
    const rateLimitResult = await checkAPIRateLimit(ip);

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000)
        },
        { status: 429 }
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.getTime().toString());
      response.headers.set('Retry-After', Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000).toString());

      return response;
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.getTime().toString());

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // Fail open - allow the request to continue if rate limiting fails
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};