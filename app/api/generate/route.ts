import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { checkIPRateLimit, checkSessionLimit, incrementSessionUsage, getClientIP } from '@/lib/rate-limit';
import { RATE_LIMIT_ERRORS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Gemini API key not configured' },
        { status: 500 }
      );
    }

    const { prompt, session_id, style_hints } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const vipSecrets = (process.env.VIP_SECRETS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const vipCookie = request.cookies.get('vip')?.value;
    const isVIP = vipCookie && vipSecrets.includes(vipCookie);

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    if (!isVIP) {
      // Check IP-based rate limit (5 generations per hour)
      const ipRateLimit = await checkIPRateLimit(clientIP);
      if (!ipRateLimit.success) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: RATE_LIMIT_ERRORS.IP_LIMIT_EXCEEDED,
            rateLimitInfo: {
              limit: ipRateLimit.limit,
              remaining: ipRateLimit.remaining,
              resetTime: ipRateLimit.reset,
            }
          },
          { status: 429 }
        );
      }

      // Check session-based limit (3 images per 30 minutes)
      const sessionLimit = await checkSessionLimit(session_id);
      if (!sessionLimit.success) {
        return NextResponse.json(
          {
            error: 'Session limit exceeded',
            message: RATE_LIMIT_ERRORS.SESSION_LIMIT_EXCEEDED,
            sessionInfo: {
              imagesUsed: sessionLimit.imagesUsed,
              imagesRemaining: sessionLimit.imagesRemaining,
              resetTime: sessionLimit.resetTime,
            }
          },
          { status: 429 }
        );
      }

      // Generate the image
      const client = new GeminiClient(apiKey);
      const result = await client.generateImage({
        prompt,
        sessionId: session_id,
        styleHints: style_hints
      });

      // Increment session usage after successful generation
      await incrementSessionUsage(session_id);

      // Return result with rate limit info
      return NextResponse.json({
        ...result,
        rateLimitInfo: {
          ipRemaining: ipRateLimit.remaining - 1, // Subtract 1 since we just used one
          ipResetTime: ipRateLimit.reset,
          sessionImagesUsed: sessionLimit.imagesUsed + 1,
          sessionImagesRemaining: sessionLimit.imagesRemaining - 1,
          sessionResetTime: sessionLimit.resetTime,
        }
      });
    }

    // VIP - skip rate limiting
    const client = new GeminiClient(apiKey);
    const result = await client.generateImage({
      prompt,
      sessionId: session_id,
      styleHints: style_hints
    });
    return NextResponse.json({ ...result, rateLimitInfo: { unlimited: true } });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}