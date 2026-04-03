import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// General rate limiter applied to all routes
export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes by default
  max: env.RATE_LIMIT_MAX,            // 100 requests per window by default
  standardHeaders: true,              // Return rate limit info in headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

// Stricter limiter for auth endpoints to prevent brute-force attacks
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // Only 10 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});