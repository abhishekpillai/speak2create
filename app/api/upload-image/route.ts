import { NextRequest, NextResponse } from 'next/server';
import { sessionImageStore } from '@/lib/image-store';
import { imageSize } from 'image-size';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('session_id') as string | null;

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'Image file and session_id are required' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Please upload JPG, PNG, or WebP files.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 5MB). Please resize and try again.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dimensions = imageSize(buffer);

    const metadata = {
      width: dimensions.width || 0,
      height: dimensions.height || 0,
      format: dimensions.type || 'unknown',
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
