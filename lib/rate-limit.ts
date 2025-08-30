import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RATE_LIMITS, REDIS_KEYS } from './constants';

// Initialize Upstash Redis client from environment variables
const redis = Redis.fromEnv();

// Create rate limiters for different types of requests
export const ipGenerationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RATE_LIMITS.IP_GENERATIONS_PER_HOUR, `${RATE_LIMITS.IP_WINDOW_MINUTES} m`),
  analytics: true,
});

export const apiRequestLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RATE_LIMITS.API_REQUESTS_PER_MINUTE, '1 m'),
  analytics: true,
});

export interface UsageInfo {
  remainingGenerations: number;
  resetTime: Date;
  sessionImagesUsed: number;
  sessionImagesRemaining: number;
  sessionResetTime: Date;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  error?: string;
}

export async function checkIPRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    const { success, limit, remaining, reset } = await ipGenerationLimiter.limit(ip);
    
    return {
      success,
      limit,
      remaining,
      reset: new Date(reset), // Convert timestamp to Date
      error: success ? undefined : 'IP rate limit exceeded'
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open for availability
    return {
      success: true,
      limit: RATE_LIMITS.IP_GENERATIONS_PER_HOUR,
      remaining: RATE_LIMITS.IP_GENERATIONS_PER_HOUR,
      reset: new Date(Date.now() + RATE_LIMITS.IP_WINDOW_MINUTES * 60 * 1000),
    };
  }
}

export async function checkAPIRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    const { success, limit, remaining, reset } = await apiRequestLimiter.limit(ip);
    
    return {
      success,
      limit,
      remaining,
      reset: new Date(reset), // Convert timestamp to Date
      error: success ? undefined : 'API rate limit exceeded'
    };
  } catch (error) {
    console.error('API rate limit check failed:', error);
    // Fail open for availability
    return {
      success: true,
      limit: RATE_LIMITS.API_REQUESTS_PER_MINUTE,
      remaining: RATE_LIMITS.API_REQUESTS_PER_MINUTE,
      reset: new Date(Date.now() + 60 * 1000),
    };
  }
}

export async function checkSessionLimit(sessionId: string): Promise<{
  success: boolean;
  imagesUsed: number;
  imagesRemaining: number;
  resetTime: Date;
}> {
  try {
    const key = REDIS_KEYS.SESSION_USAGE(sessionId);
    const currentUsage = await redis.get<number>(key) || 0;
    const imagesRemaining = Math.max(0, RATE_LIMITS.SESSION_IMAGES_LIMIT - currentUsage);
    const success = currentUsage < RATE_LIMITS.SESSION_IMAGES_LIMIT;
    
    // Calculate reset time (30 minutes from first usage in this session)
    const resetTime = new Date(Date.now() + RATE_LIMITS.SESSION_WINDOW_MINUTES * 60 * 1000);
    
    return {
      success,
      imagesUsed: currentUsage,
      imagesRemaining,
      resetTime,
    };
  } catch (error) {
    console.error('Session limit check failed:', error);
    // Fail open
    return {
      success: true,
      imagesUsed: 0,
      imagesRemaining: RATE_LIMITS.SESSION_IMAGES_LIMIT,
      resetTime: new Date(Date.now() + RATE_LIMITS.SESSION_WINDOW_MINUTES * 60 * 1000),
    };
  }
}

export async function incrementSessionUsage(sessionId: string): Promise<void> {
  try {
    const key = REDIS_KEYS.SESSION_USAGE(sessionId);
    const currentUsage = await redis.get<number>(key) || 0;
    const newUsage = currentUsage + 1;
    
    // Set with TTL of session window (30 minutes in seconds)
    await redis.set(key, newUsage, {
      ex: RATE_LIMITS.SESSION_WINDOW_MINUTES * 60,
    });
  } catch (error) {
    console.error('Failed to increment session usage:', error);
  }
}

export async function getUsageInfo(ip: string, sessionId: string): Promise<UsageInfo> {
  const [ipLimit, sessionLimit] = await Promise.all([
    checkIPRateLimit(ip),
    checkSessionLimit(sessionId),
  ]);
  
  return {
    remainingGenerations: ipLimit.remaining,
    resetTime: ipLimit.reset,
    sessionImagesUsed: sessionLimit.imagesUsed,
    sessionImagesRemaining: sessionLimit.imagesRemaining,
    sessionResetTime: sessionLimit.resetTime,
  };
}

export function getClientIP(request: Request): string {
  // Check various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}