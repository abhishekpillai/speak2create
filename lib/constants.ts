export const RATE_LIMITS = {
  // IP-based rate limiting: 10 generations per hour per IP (increased for better UX)
  IP_GENERATIONS_PER_HOUR: 10,
  IP_WINDOW_MINUTES: 60,
  
  // Session-based limits: 10 images per 20-minute session (increased limit, reduced window)
  SESSION_IMAGES_LIMIT: 10,
  SESSION_WINDOW_MINUTES: 20,
  
  // General API rate limiting
  API_REQUESTS_PER_MINUTE: 20,
  
  // Session creation rate limits (to prevent OpenAI token abuse)
  SESSION_CREATIONS_PER_HOUR: 2,
  SESSION_INIT_PER_5MIN: 1,
} as const;

export const RATE_LIMIT_ERRORS = {
  IP_LIMIT_EXCEEDED: 'System is at capacity. Please try again in a few minutes.',
  SESSION_LIMIT_EXCEEDED: 'System is at capacity. Please try again in a few minutes.',
  API_LIMIT_EXCEEDED: 'System is experiencing high demand. Please try again shortly.',
  SESSION_CREATION_EXCEEDED: 'Voice session limit reached. Please wait before starting a new session.',
  SESSION_INIT_EXCEEDED: 'Too many session requests. Please wait a moment before trying again.',
} as const;

export const REDIS_KEYS = {
  IP_GENERATION: (ip: string) => `ip:gen:${ip}`,
  SESSION_USAGE: (sessionId: string) => `session:usage:${sessionId}`,
  API_REQUESTS: (ip: string) => `api:req:${ip}`,
  SESSION_CREATION: (ip: string) => `session:create:${ip}`,
  SESSION_INIT: (ip: string) => `session:init:${ip}`,
} as const;