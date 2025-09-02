import { NextRequest, NextResponse } from 'next/server';
import { sessionImageStore } from '@/lib/image-store';
import { imageSize } from 'image-size';
import { checkIPRateLimit, getClientIP } from '@/lib/rate-limit';
import { RATE_LIMIT_ERRORS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check IP-based rate limit (5 generations per hour) - same as generate endpoint
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('session_id') as string | null;

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'Image file and session_id are required' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Please upload JPG, PNG, WebP, or HEIC files.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 5MB). Please resize and try again.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let dimensions: any;
    try {
      dimensions = imageSize(buffer);
    } catch {
      dimensions = { width: 0, height: 0, type: file.type.split('/')[1] };
    }

    const metadata = {
      width: dimensions.width || 0,
      height: dimensions.height || 0,
      format: dimensions.type || file.type.split('/')[1] || 'unknown',
    };

    let imageId: string;
    try {
      imageId = sessionImageStore.storeImage(sessionId, buffer, metadata);
    } catch (err: any) {
      if (err.message === 'Session image limit reached') {
        return NextResponse.json({ error: 'Session image limit reached' }, { status: 400 });
      }
      if (err.message === 'Service at capacity') {
        return NextResponse.json({ error: 'Service at capacity. Try again in a few minutes.' }, { status: 503 });
      }
      throw err;
    }

    const imageUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
    const usage = sessionImageStore.getSessionUsage(sessionId);

    return NextResponse.json({
      image_id: imageId,
      image_url: imageUrl,
      metadata,
      session_limits: { images_used: usage.imagesUsed, max_images: usage.maxImages }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
