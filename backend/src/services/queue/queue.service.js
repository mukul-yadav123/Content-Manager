import { Queue, Worker } from 'bullmq';
import { redisConfig, getRedisStatus } from '../../config/redis.js';
import logger from '../../utils/logger.js';

const queues = new Map();

/**
 * Get or create a BullMQ Queue
 */
export const getQueue = (queueName) => {
  const status = getRedisStatus();
  if (!status.isConnected) {
    logger.warn(`Redis is not connected. Queue "${queueName}" running in degraded mode.`);
  }

  if (!queues.has(queueName)) {
    try {
      const queue = new Queue(queueName, {
        connection: redisConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          },
          removeOnComplete: 100,
          removeOnFail: 200
        }
      });
      queues.set(queueName, queue);
      logger.info(`BullMQ Queue initialized: ${queueName}`);
    } catch (error) {
      logger.error(`Failed to initialize BullMQ queue "${queueName}": ${error.message}`);
      return null;
    }
  }

  return queues.get(queueName);
};

/**
 * Add a job to a queue
 */
export const addJob = async (queueName, jobName, data, options = {}) => {
  const queue = getQueue(queueName);
  if (!queue) {
    logger.warn(`Queue ${queueName} unavailable. Skipping job enqueue.`);
    return null;
  }
  return await queue.add(jobName, data, options);
};

export default {
  getQueue,
  addJob
};

