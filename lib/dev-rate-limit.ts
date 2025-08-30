// Simple in-memory rate limiter for development/testing
// DO NOT use in production - data will be lost on server restart

interface InMemoryStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class InMemoryRateLimit {
  private store: InMemoryStore = {};

  async limit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const entry = this.store[key];

    // If entry doesn't exist or window has expired, reset
    if (!entry || now >= entry.resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: new Date(now + windowMs),
      };
    }

    // Increment count
    entry.count++;
    
    return {
      success: entry.count <= limit,
      limit,
      remaining: Math.max(0, limit - entry.count),
      reset: new Date(entry.resetTime),
    };
  }

  async get(key: string): Promise<number | null> {
    const entry = this.store[key];
    if (!entry || Date.now() >= entry.resetTime) {
      return null;
    }
    return entry.count;
  }

  async set(key: string, value: number, ttlMs: number): Promise<void> {
    this.store[key] = {
      count: value,
      resetTime: Date.now() + ttlMs,
    };
  }
}

export const devRateLimit = new InMemoryRateLimit();