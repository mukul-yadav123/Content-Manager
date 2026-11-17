import Redis from 'ioredis';
import env from './env.js';
import logger from '../utils/logger.js';

let redisClient = null;
let isRedisConnected = false;

export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    if (times > 3) {
      logger.warn('Redis reconnection retries exhausted for now.');
      return null; // Stop retrying after 3 attempts in local dev
    }
    return Math.min(times * 1000, 3000);
  },
  lazyConnect: true
};

export const initRedis = async () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info(`Redis Connected to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
    });

    redisClient.on('ready', () => {
      isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      logger.warn(`Redis connection error: ${err.message}`);
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
    });

    await redisClient.connect().catch((err) => {
      logger.warn(`Redis initial connect failed (${err.message}). Queue operations will run degraded.`);
    });

    return redisClient;
  } catch (error) {
    logger.warn(`Could not initialize Redis client: ${error.message}`);
    return null;
  }
};

export const getRedisClient = () => redisClient;

export const getRedisStatus = () => {
  return {
    status: isRedisConnected ? 'connected' : 'disconnected',
    isConnected: isRedisConnected,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT
  };
};

export default { initRedis, getRedisClient, getRedisStatus, redisConfig };

