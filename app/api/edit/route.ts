import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { sessionImageStore } from '@/lib/image-store';
import { checkIPRateLimit, checkSessionLimit, incrementSessionUsage, getClientIP } from '@/lib/rate-limit';
import { RATE_LIMIT_ERRORS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  console.log('🚀 Edit API route called');
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Gemini API key not configured' },
        { status: 500 }
      );
    }

    const { base_image_id, image_data, edit_instruction, session_id } = await request.json();
    console.log('📝 Edit request data:', {
      base_image_id,
      hasImageData: !!image_data,
      edit_instruction,
      session_id
    });

    if (!edit_instruction) {
      return NextResponse.json(
        { error: 'Edit instruction is required' },
        { status: 400 }
      );
    }

    let finalImageData: string;
    let mime: string;

    // Handle uploaded image flow (with base_image_id)
    if (base_image_id) {
      const stored = sessionImageStore.getImage(session_id, base_image_id);
      if (!stored) {
        return NextResponse.json(
          { error: 'Session expired. Please upload your image again.' },
          { status: 400 }
        );
      }
      mime = stored.metadata.format === 'jpg' ? 'image/jpeg' : `image/${stored.metadata.format}`;
      finalImageData = `data:${mime};base64,${stored.data.toString('base64')}`;
    } 
    // Handle generated image flow (with image_data)
    else if (image_data) {
      finalImageData = image_data;
      // Extract mime type from data URI
      const mimeMatch = image_data.match(/^data:([^;]+);base64,/);
      mime = mimeMatch ? mimeMatch[1] : 'image/png';
    } 
    // Neither provided
    else {
      return NextResponse.json(
        { error: 'Either base_image_id or image_data is required' },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

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

    console.log('🤖 Calling Gemini client editImage...');
    const client = new GeminiClient(apiKey);
    const result = await client.editImage({
      imageId: base_image_id || 'generated_image',
      imageData: finalImageData,
      mimeType: mime,
      editInstruction: edit_instruction,
      sessionId: session_id
    });

    // Increment session usage after successful edit
    await incrementSessionUsage(session_id);

    console.log('✅ Edit successful, returning result');
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
  } catch (error) {
    console.error('❌ Image editing API error:', error);
    return NextResponse.json(
      { error: 'Failed to edit image' },
      { status: 500 }
    );
  }
}