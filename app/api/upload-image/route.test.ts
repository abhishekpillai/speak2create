/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const storeImage = vi.fn();
const getSessionUsage = vi.fn();
const sessionImageStore = {
  storeImage,
  getSessionUsage,
};
vi.mock('@/lib/image-store', () => ({
  sessionImageStore,
}));

// Mock image-size
const imageSize = vi.fn();
vi.mock('image-size', () => ({
  imageSize,
}));

// Mock rate limiting
const checkIPRateLimit = vi.fn();
const getClientIP = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  checkIPRateLimit,
  getClientIP,
}));

// Mock constants
vi.mock('@/lib/constants', () => ({
  RATE_LIMIT_ERRORS: {
    IP_LIMIT_EXCEEDED: 'IP rate limit exceeded'
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  
  // Set default successful rate limiting
  checkIPRateLimit.mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    reset: new Date(Date.now() + 3600000)
  });
  getClientIP.mockReturnValue('127.0.0.1');
});

describe('POST /api/upload-image', () => {
  it('returns 400 when file missing', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    formData.append('session_id', 's1');
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Image file and session_id are required');
  });

  it('returns 400 when session_id missing', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Image file and session_id are required');
  });

  it('returns 400 for unsupported file type', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    const file = new File(['test'], 'test.gif', { type: 'image/gif' });
    formData.append('file', file);
    formData.append('session_id', 's1');
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Please upload JPG, PNG, WebP, or HEIC files.');
  });

  it('accepts HEIC files', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    const file = new File(['test'], 'test.heic', { type: 'image/heic' });
    formData.append('file', file);
    formData.append('session_id', 's1');

    imageSize.mockImplementationOnce(() => {
      throw new Error('unsupported file type');
    });
    storeImage.mockReturnValueOnce('img123');
    getSessionUsage.mockReturnValueOnce({ imagesUsed: 1, maxImages: 5 });

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.image_id).toBe('img123');
    expect(data.metadata.format).toBe('heic');
  });

  it('returns 400 for file too large', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    // Create a file that's larger than 10MB
    const largeBuffer = new ArrayBuffer(11 * 1024 * 1024); // 11MB
    const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('session_id', 's1');
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Image too large (max 10MB). Please resize and try again.');
  });

  it('returns 429 when IP rate limit exceeded', async () => {
    const { POST } = await import('./route');
    
    // Mock rate limit exceeded
    checkIPRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: new Date(Date.now() + 3600000)
    });
    
    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('session_id', 's1');
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('Rate limit exceeded');
    expect(data.message).toBe('IP rate limit exceeded');
  });

  it('returns 400 when session image limit reached', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('session_id', 's1');
    
    imageSize.mockReturnValueOnce({ width: 100, height: 100, type: 'jpg' });
    storeImage.mockImplementationOnce(() => {
      throw new Error('Session image limit reached');
    });
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Session image limit reached');
  });

  it('returns 503 when service at capacity', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('session_id', 's1');
    
    imageSize.mockReturnValueOnce({ width: 100, height: 100, type: 'jpg' });
    storeImage.mockImplementationOnce(() => {
      throw new Error('Service at capacity');
    });
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe('Service at capacity. Try again in a few minutes.');
  });

  it('returns 200 on successful upload', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('session_id', 's1');
    
    imageSize.mockReturnValueOnce({ width: 100, height: 100, type: 'jpg' });
    storeImage.mockReturnValueOnce('img123');
    getSessionUsage.mockReturnValueOnce({ imagesUsed: 1, maxImages: 5 });
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.image_id).toBe('img123');
    expect(data.image_url).toContain('data:image/jpeg;base64,');
    expect(data.metadata).toEqual({
      width: 100,
      height: 100,
      format: 'jpg',
    });
    expect(data.session_limits).toEqual({
      images_used: 1,
      max_images: 5,
    });
  });

  it('returns 500 on unexpected error', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('session_id', 's1');
    
    imageSize.mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });
    
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: formData,
    });
    
    const res = await POST(req as any);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to upload image');
  });
});