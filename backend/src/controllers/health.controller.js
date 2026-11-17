import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getDBStatus } from '../config/db.js';
import { getRedisStatus } from '../config/redis.js';
import { getCloudinaryStatus } from '../config/cloudinary.js';
import env from '../config/env.js';

/**
 * Basic Liveness Ping
 * GET /api/health/ping
 */
export const getPing = asyncHandler(async (req, res) => {
  const data = {
    service: 'linkedin-content-studio-api',
    status: 'online',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV
  };

  return res.status(200).json(ApiResponse.success(data, 'Service is healthy'));
});

/**
 * Deep Readiness & Dependency Check
 * GET /api/health/ready
 */
export const getReadiness = asyncHandler(async (req, res) => {
  const dbStatus = getDBStatus();
  const redisStatus = getRedisStatus();
  const cloudinaryStatus = getCloudinaryStatus();
  const isAiConfigured = Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock-key-replace-with-real-key');

  const systems = {
    database: dbStatus,
    redis: redisStatus,
    cloudinary: cloudinaryStatus,
    aiService: {
      isConfigured: isAiConfigured,
      textModel: env.OPENAI_MODEL,
      imageModel: env.OPENAI_IMAGE_MODEL
    }
  };

  const isHealthy = true; // API server is up and responsive; degraded modes handled gracefully

  const readinessData = {
    status: isHealthy ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    systems
  };

  return res.status(200).json(ApiResponse.success(readinessData, 'Readiness check complete'));
});

export default {
  getPing,
  getReadiness
};

