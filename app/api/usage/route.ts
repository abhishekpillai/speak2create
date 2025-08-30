import { NextRequest, NextResponse } from 'next/server';
import { getUsageInfo, getClientIP } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const clientIP = getClientIP(request);
    const usageInfo = await getUsageInfo(clientIP, sessionId);

    return NextResponse.json(usageInfo);
  } catch (error) {
    console.error('Usage info error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage information' },
      { status: 500 }
    );
  }
}