import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Gemini API key not configured' },
        { status: 500 }
      );
    }

    const { image_id, image_data, edit_instruction, session_id } = await request.json();

    if (!image_data || !edit_instruction) {
      return NextResponse.json(
        { error: 'Image data and edit instruction are required' },
        { status: 400 }
      );
    }

    const client = new GeminiClient(apiKey);
    const result = await client.editImage({
      imageId: image_id,
      imageData: image_data,
      editInstruction: edit_instruction,
      sessionId: session_id
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image editing error:', error);
    return NextResponse.json(
      { error: 'Failed to edit image' },
      { status: 500 }
    );
  }
}