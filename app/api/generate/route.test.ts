import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const checkIPRateLimit = vi.fn();
const checkSessionLimit = vi.fn();
const incrementSessionUsage = vi.fn();
const getClientIP = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  checkIPRateLimit,
  checkSessionLimit,
  incrementSessionUsage,
  getClientIP,
}));

const generateImage = vi.fn();
class MockGeminiClient {
  generateImage = generateImage;
}
vi.mock('@/lib/gemini', () => ({
  GeminiClient: MockGeminiClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env.GOOGLE_GEMINI_API_KEY = 'test-key';
});

describe('POST /api/generate', () => {
  it('returns 400 when prompt missing', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ session_id: 's1' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 429 when IP limit exceeded', async () => {
    checkIPRateLimit.mockResolvedValueOnce({ success: false, limit: 10, remaining: 0, reset: new Date() });
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test', session_id: 's1' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });

  it('returns 200 on success', async () => {
    checkIPRateLimit.mockResolvedValueOnce({ success: true, limit: 10, remaining: 10, reset: new Date() });
    checkSessionLimit.mockResolvedValueOnce({ success: true, imagesUsed: 0, imagesRemaining: 5, resetTime: new Date() });
    getClientIP.mockReturnValue('1.1.1.1');
    generateImage.mockResolvedValueOnce({ imageUrl: 'url', imageId: 'img', processedPrompt: 'p' });
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test', session_id: 's1' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.imageUrl).toBe('url');
    expect(incrementSessionUsage).toHaveBeenCalledWith('s1');
  });

  it('returns 500 when API key missing', async () => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test', session_id: 's1' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
