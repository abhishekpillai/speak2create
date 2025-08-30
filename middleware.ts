import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkAPIRateLimit, getClientIP } from '@/lib/rate-limit';

// Geographic filtering - allowed countries for initial launch
const allowedCountries = [
  // Major English-speaking markets
  'US', 'CA', 'GB', 'AU', 'IE', 'NZ',
  
  // Major European markets
  'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI',
  'CH', 'AT', 'BE', 'PT',
  
  // Major Asian markets (lower abuse risk)
  'JP', 'SG', 'KR',
  
  // Latin American markets (major economies, lower abuse risk)
  'MX', 'BR', 'AR', 'CL', 'CO', 'CR', 'UY', 'VE',
  
  // Other developed markets
  'IL', 'AE'
  
  // Note: Excluding regions commonly associated with abuse/bot traffic:
  // - Some Eastern European countries (high VPN/bot activity)
  // - Certain South Asian countries (click farms)  
  // - Some African regions (economic incentives for abuse)
  // This can be expanded as we monitor usage patterns
];

export async function middleware(request: NextRequest) {
  // Geographic filtering - check country before processing
  const country = (request as any).geo?.country;
  if (country && !allowedCountries.includes(country)) {
    return new Response(
      JSON.stringify({
        error: 'Geographic restriction',
        message: 'Service not available in your region yet. We\'re working to expand globally soon!',
        country: country
      }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

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
    // Apply geographic filtering to all routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};