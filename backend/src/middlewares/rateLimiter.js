import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const isTest = env.NODE_ENV === 'test';

/**
 * Standard API rate limiter
 * Applied globally to all /api routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: () => isTest,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

/**
 * Strict rate limiter for Authentication endpoints (login, register)
 * Mitigates credential stuffing and brute-force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 20, // Limit each IP to 20 auth attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

/**
 * AI Generation rate limiter for resource-intensive LLM, DALL-E, and headless browser operations
 */
export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 30, // Limit to 30 generation requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    success: false,
    statusCode: 429,
    message: 'Generation rate limit reached. Please wait a moment before initiating another generation.'
  }
});

export default {
  apiLimiter,
  authLimiter,
  aiGenerationLimiter
};

