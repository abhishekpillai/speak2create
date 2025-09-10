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

    // Validate image size for Gemini API (7MB limit for the original file)
    // Base64 encoding adds ~33% overhead, but we check original size
    let originalImageSize = 0;
    if (base_image_id) {
      // For uploaded images, get the original buffer size
      const stored = sessionImageStore.getImage(session_id, base_image_id);
      originalImageSize = stored?.data.length || 0;
    } else if (image_data) {
      // For generated images, estimate original size from base64
      const base64Data = image_data.split(',')[1] || '';
      originalImageSize = Math.floor((base64Data.length * 3) / 4);
    }
    
    // Gemini API has a 7MB limit per image
    const geminiMaxSize = 7 * 1024 * 1024; // 7MB
    if (originalImageSize > geminiMaxSize) {
      return NextResponse.json(
        { 
          error: 'Image too large for editing',
          message: 'This image is too large for our AI to process. Please try using standard photo mode instead of RAW/ProRAW, or resize the image to under 7MB.'
        },
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
    }

    // VIP - skip rate limiting
    console.log('🤖 Calling Gemini client editImage...');
    const client = new GeminiClient(apiKey);
    const result = await client.editImage({
      imageId: base_image_id || 'generated_image',
      imageData: finalImageData,
      mimeType: mime,
      editInstruction: edit_instruction,
      sessionId: session_id
    });
    console.log('✅ Edit successful, returning result');
    return NextResponse.json({ ...result, rateLimitInfo: { unlimited: true } });
  } catch (error) {
    console.error('❌ Image editing API error:', error);
    return NextResponse.json(
      { error: 'Failed to edit image' },
      { status: 500 }
    );
  }
}