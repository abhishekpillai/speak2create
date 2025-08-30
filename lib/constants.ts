export const RATE_LIMITS = {
  // IP-based rate limiting: 5 generations per hour per IP
  IP_GENERATIONS_PER_HOUR: 5,
  IP_WINDOW_MINUTES: 60,
  
  // Session-based limits: 3 images per 30-minute session
  SESSION_IMAGES_LIMIT: 3,
  SESSION_WINDOW_MINUTES: 30,
  
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