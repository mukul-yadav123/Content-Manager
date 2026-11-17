import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { connectDB } from './config/db.js';
import { initRedis } from './config/redis.js';
import { initCloudinary } from './config/cloudinary.js';

let server;

const startServer = async () => {
  try {
    // Start listening immediately so liveness probes and ping endpoints respond without latency
    server = app.listen(env.PORT, () => {
      logger.info(`Server is running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
      logger.info(`Health check: http://localhost:${env.PORT}/api/health/ping`);
      logger.info(`Readiness check: http://localhost:${env.PORT}/api/health/ready`);
    });

    // Initialize external services in background
    logger.info('Initializing external service connections (MongoDB, Redis, Cloudinary)...');
    connectDB().catch((err) => logger.warn(`MongoDB deferred connect: ${err.message}`));
    initRedis().catch((err) => logger.warn(`Redis deferred connect: ${err.message}`));
    initCloudinary();
  } catch (error) {
    logger.error(`Critical startup failure: ${error.message}`);
    process.exit(1);
  }
};

const handleShutdown = (signal) => {
  logger.info(`Received ${signal}. Gracefully terminating application...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Promise Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

startServer();
