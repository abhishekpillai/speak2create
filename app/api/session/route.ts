import { NextRequest, NextResponse } from 'next/server';
import { checkSessionCreationRateLimit, getClientIP } from '@/lib/rate-limit';
import { RATE_LIMIT_ERRORS } from '@/lib/constants';
import { jwtVerify } from 'jose';
import { randomUUID } from 'crypto';

// JWT secret for token validation
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_INIT_SECRET || 'your-session-init-secret-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Get client IP for rate limiting and validation
    const clientIP = getClientIP(request);

    // Parse request body for initiation token
    const body = await request.json();
    const { initToken } = body;

    if (!initToken) {
      return NextResponse.json(
        { error: 'Session initiation token required' },
        { status: 401 }
      );
    }

    // Verify the initiation token
    try {
      const { payload } = await jwtVerify(initToken, JWT_SECRET);
      
      // Verify the token was created for the same IP
      if (payload.ip !== clientIP && clientIP !== 'unknown') {
        console.warn('Session token IP mismatch:', { tokenIP: payload.ip, requestIP: clientIP });
        return NextResponse.json(
          { error: 'Invalid session token' },
          { status: 401 }
        );
      }
      
      // Verify purpose
      if (payload.purpose !== 'session-init') {
        return NextResponse.json(
          { error: 'Invalid token purpose' },
          { status: 401 }
        );
      }
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json(
        { error: 'Invalid or expired session token' },
        { status: 401 }
      );
    }

    // Check if VIP user (bypass rate limits)
    const vipSecrets = (process.env.VIP_SECRETS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const vipCookie = request.cookies.get('vip')?.value;
    const isVIP = vipCookie && vipSecrets.includes(vipCookie);

    if (!isVIP) {
      // Check session creation rate limit (2 per hour)
      const rateLimitResult = await checkSessionCreationRateLimit(clientIP);
      if (!rateLimitResult.success) {
        // Log for monitoring
        console.log('Session creation rate limit exceeded:', { ip: clientIP, remaining: rateLimitResult.remaining });
        
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: RATE_LIMIT_ERRORS.SESSION_CREATION_EXCEEDED,
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

    // Create ephemeral token for OpenAI Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Generate secure session ID
    const sessionId = `session_${randomUUID()}`;
    
    // Log session creation for monitoring (without sensitive data)
    console.log('OpenAI session created:', {
      sessionId,
      ip: clientIP,
      isVIP,
      timestamp: new Date().toISOString(),
      estimatedCost: '$0.006/min voice input + $0.024/min voice output'
    });
    
    return NextResponse.json({
      token: data.client_secret.value,
      expires_at: new Date(Date.now() + 60000), // 60 seconds
      session_id: sessionId
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}