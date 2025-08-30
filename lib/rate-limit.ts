import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RATE_LIMITS, REDIS_KEYS } from './constants';
import { devRateLimit } from './dev-rate-limit';

// Check if Redis is configured
const isRedisConfigured = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;

// Initialize Redis client for Upstash (only if configured)
let redis: Redis | null = null;
let ipGenerationLimiter: Ratelimit | null = null;
let apiRequestLimiter: Ratelimit | null = null;

if (isRedisConfigured) {
  try {
    redis = Redis.fromEnv();
    
    // Create rate limiters for different types of requests
    ipGenerationLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMITS.IP_GENERATIONS_PER_HOUR, `${RATE_LIMITS.IP_WINDOW_MINUTES} m`),
      analytics: true,
    });

    apiRequestLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMITS.API_REQUESTS_PER_MINUTE, '1 m'),
      analytics: true,
    });
  } catch (error) {
    console.warn('Redis not configured, using in-memory rate limiting for development');
  }
}

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
    if (ipGenerationLimiter) {
      const { success, limit, remaining, reset } = await ipGenerationLimiter.limit(ip);
      
      return {
        success,
        limit,
        remaining,
        reset,
        error: success ? undefined : 'IP rate limit exceeded'
      };
    } else {
      // Use development rate limiter
      const windowMs = RATE_LIMITS.IP_WINDOW_MINUTES * 60 * 1000;
      const result = await devRateLimit.limit(ip, RATE_LIMITS.IP_GENERATIONS_PER_HOUR, windowMs);
      
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        error: result.success ? undefined : 'IP rate limit exceeded'
      };
    }
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return {
      success: true, // Fail open for availability
      limit: RATE_LIMITS.IP_GENERATIONS_PER_HOUR,
      remaining: RATE_LIMITS.IP_GENERATIONS_PER_HOUR,
      reset: new Date(Date.now() + RATE_LIMITS.IP_WINDOW_MINUTES * 60 * 1000),
    };
  }
}

export async function checkAPIRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    if (apiRequestLimiter) {
      const { success, limit, remaining, reset } = await apiRequestLimiter.limit(ip);
      
      return {
        success,
        limit,
        remaining,
        reset,
        error: success ? undefined : 'API rate limit exceeded'
      };
    } else {
      // Use development rate limiter
      const windowMs = 60 * 1000; // 1 minute
      const result = await devRateLimit.limit(`api:${ip}`, RATE_LIMITS.API_REQUESTS_PER_MINUTE, windowMs);
      
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        error: result.success ? undefined : 'API rate limit exceeded'
      };
    }
  } catch (error) {
    console.error('API rate limit check failed:', error);
    return {
      success: true, // Fail open for availability
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
    if (isRedisConfigured) {
      const key = REDIS_KEYS.SESSION_USAGE(sessionId);
      const currentUsage = await kv.get<number>(key) || 0;
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
    } else {
      // Use development rate limiter
      const currentUsage = await devRateLimit.get(`session:${sessionId}`) || 0;
      const imagesRemaining = Math.max(0, RATE_LIMITS.SESSION_IMAGES_LIMIT - currentUsage);
      const success = currentUsage < RATE_LIMITS.SESSION_IMAGES_LIMIT;
      
      const resetTime = new Date(Date.now() + RATE_LIMITS.SESSION_WINDOW_MINUTES * 60 * 1000);
      
      return {
        success,
        imagesUsed: currentUsage,
        imagesRemaining,
        resetTime,
      };
    }
  } catch (error) {
    console.error('Session limit check failed:', error);
    return {
      success: true, // Fail open
      imagesUsed: 0,
      imagesRemaining: RATE_LIMITS.SESSION_IMAGES_LIMIT,
      resetTime: new Date(Date.now() + RATE_LIMITS.SESSION_WINDOW_MINUTES * 60 * 1000),
    };
  }
}

export async function incrementSessionUsage(sessionId: string): Promise<void> {
  try {
    if (isRedisConfigured) {
      const key = REDIS_KEYS.SESSION_USAGE(sessionId);
      const currentUsage = await kv.get<number>(key) || 0;
      const newUsage = currentUsage + 1;
      
      // Set with TTL of session window
      await kv.set(key, newUsage, {
        ex: RATE_LIMITS.SESSION_WINDOW_MINUTES * 60, // 30 minutes in seconds
      });
    } else {
      // Use development rate limiter
      const currentUsage = await devRateLimit.get(`session:${sessionId}`) || 0;
      const newUsage = currentUsage + 1;
      const ttlMs = RATE_LIMITS.SESSION_WINDOW_MINUTES * 60 * 1000;
      
      await devRateLimit.set(`session:${sessionId}`, newUsage, ttlMs);
    }
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