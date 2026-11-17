import morgan from 'morgan';
import logger from '../utils/logger.js';
import env from '../config/env.js';

// Stream integration with Winston
const stream = {
  write: (message) => logger.http(message.trim())
};

// Skip static assets or ping checks in production if needed
const skip = () => {
  return env.NODE_ENV === 'test';
};

export const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

export default requestLogger;

