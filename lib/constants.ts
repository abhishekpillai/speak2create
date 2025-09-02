export const RATE_LIMITS = {
  // IP-based rate limiting: 10 generations per hour per IP (increased for better UX)
  IP_GENERATIONS_PER_HOUR: 10,
  IP_WINDOW_MINUTES: 60,
  
  // Session-based limits: 10 images per 20-minute session (increased limit, reduced window)
  SESSION_IMAGES_LIMIT: 10,
  SESSION_WINDOW_MINUTES: 20,
  
  // General API rate limiting
  API_REQUESTS_PER_MINUTE: 20,
} as const;

export const RATE_LIMIT_ERRORS = {
  IP_LIMIT_EXCEEDED: 'System is at capacity. Please try again in a few minutes.',
  SESSION_LIMIT_EXCEEDED: 'System is at capacity. Please try again in a few minutes.',
  API_LIMIT_EXCEEDED: 'System is experiencing high demand. Please try again shortly.',
} as const;

export const REDIS_KEYS = {
  IP_GENERATION: (ip: string) => `ip:gen:${ip}`,
  SESSION_USAGE: (sessionId: string) => `session:usage:${sessionId}`,
  API_REQUESTS: (ip: string) => `api:req:${ip}`,
} as const;