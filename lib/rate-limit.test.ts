import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks for Upstash clients
const limitMock = vi.fn();
const getRemainingMock = vi.fn();
const redisGetMock = vi.fn();
const redisSetMock = vi.fn();

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn();
    limit = limitMock;
    getRemaining = getRemainingMock;
  }
}));

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = redisGetMock;
    set = redisSetMock;
  }
}));

// Ensure env vars for module initialization
beforeEach(() => {
  process.env.KV_REST_API_URL = 'https://example.com';
  process.env.KV_REST_API_TOKEN = 'token';
  vi.resetAllMocks();
  vi.resetModules();
});

describe('rate-limit utilities', () => {
  it('uses expected rate limit constants', async () => {
    const { RATE_LIMITS } = await import('./constants');
    expect(RATE_LIMITS.IP_GENERATIONS_PER_HOUR).toBe(10);
    expect(RATE_LIMITS.SESSION_IMAGES_LIMIT).toBe(5);
    expect(RATE_LIMITS.API_REQUESTS_PER_MINUTE).toBe(20);
  });

  it('returns rate limit result on success', async () => {
    limitMock.mockResolvedValueOnce({ success: true, limit: 10, remaining: 9, reset: Date.now() });
    const { checkIPRateLimit } = await import('./rate-limit');
    const result = await checkIPRateLimit('1.1.1.1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('fails open when limiter throws', async () => {
    limitMock.mockRejectedValueOnce(new Error('redis down'));
    const { checkIPRateLimit } = await import('./rate-limit');
    const { RATE_LIMITS } = await import('./constants');
    const result = await checkIPRateLimit('1.1.1.1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.IP_GENERATIONS_PER_HOUR);
  });

  it('computes session limits and increments', async () => {
    redisGetMock.mockResolvedValueOnce(2);
    const { checkSessionLimit } = await import('./rate-limit');
    const result = await checkSessionLimit('session1');
    expect(result).toMatchObject({ success: true, imagesUsed: 2, imagesRemaining: 3 });
  });

  it('getClientIP parses headers', async () => {
    const { getClientIP } = await import('./rate-limit');
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '8.8.8.8, 1.1.1.1' }
    });
    expect(getClientIP(req as any)).toBe('8.8.8.8');
  });
});
