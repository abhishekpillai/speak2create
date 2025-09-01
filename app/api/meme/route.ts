import { NextRequest, NextResponse } from 'next/server';
import { memegenClient, MemeGenerationRequest } from '@/lib/memegen';
import { checkIPRateLimit, checkSessionLimit, incrementSessionUsage, getClientIP } from '@/lib/rate-limit';
import { RATE_LIMIT_ERRORS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { template, topText, bottomText, customTexts, session_id } = await request.json();

    if (!template) {
      return NextResponse.json(
        { error: 'Template is required' },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check IP-based rate limit (same as image generation)
    const ipRateLimit = await checkIPRateLimit(clientIP);
    if (!ipRateLimit.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: RATE_LIMIT_ERRORS.IP_EXCEEDED,
          rateLimitInfo: {
            ipGenerationsUsed: ipRateLimit.limit - ipRateLimit.remaining,
            ipGenerationsRemaining: ipRateLimit.remaining,
            resetTime: ipRateLimit.reset.toISOString()
          }
        },
        { status: 429 }
      );
    }

    // Check session-based rate limit if session_id provided
    let sessionLimit = null;
    if (session_id) {
      sessionLimit = await checkSessionLimit(session_id);
      if (!sessionLimit.success) {
        return NextResponse.json(
          {
            error: 'Session limit exceeded',
            message: RATE_LIMIT_ERRORS.SESSION_EXCEEDED,
            sessionInfo: {
              sessionImagesUsed: sessionLimit.imagesUsed,
              sessionImagesRemaining: sessionLimit.imagesRemaining,
              resetTime: sessionLimit.resetTime.toISOString()
            }
          },
          { status: 429 }
        );
      }
    }

    // Generate meme
    const memeRequest: MemeGenerationRequest = {
      template,
      topText,
      bottomText,
      customTexts
    };

    const result = await memegenClient.generateMeme(memeRequest);

    // Record usage for rate limiting
    if (session_id) {
      await incrementSessionUsage(session_id);
    }

    // Get updated rate limit info
    const updatedSessionLimit = session_id ? 
      await checkSessionLimit(session_id) : null;

    return NextResponse.json({
      imageUrl: result.imageUrl,
      templateUsed: result.templateUsed,
      templateName: result.templateName,
      rateLimitInfo: {
        ipGenerationsUsed: ipRateLimit.limit - ipRateLimit.remaining + 1,
        ipGenerationsRemaining: ipRateLimit.remaining - 1,
        ...(updatedSessionLimit && {
          sessionImagesUsed: updatedSessionLimit.imagesUsed,
          sessionImagesRemaining: updatedSessionLimit.imagesRemaining
        })
      }
    });

  } catch (error: any) {
    console.error('Meme generation error:', error);

    // Handle specific error cases
    if (error.message?.includes('Template not found')) {
      return NextResponse.json(
        { 
          error: 'Template not found',
          message: `Could not find meme template: "${error.message.split(': ')[1]}". Try describing the meme differently.`
        },
        { status: 404 }
      );
    }

    if (error.message?.includes('Failed to generate meme')) {
      return NextResponse.json(
        { 
          error: 'Generation failed',
          message: 'Unable to generate meme. Please try again with different text.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}