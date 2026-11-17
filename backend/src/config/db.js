import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
      autoIndex: env.NODE_ENV !== 'production'
    });

    isConnected = conn.connection.readyState === 1;
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    logger.warn(`MongoDB initial connection failed (${error.message}). Running in degraded/mock mode.`);
    return null;
  }
};

mongoose.connection.on('connected', () => {
  isConnected = true;
  logger.info('MongoDB event: connected');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  logger.error(`MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB event: disconnected');
});

export const getDBStatus = () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const readyState = mongoose.connection.readyState;
  return {
    status: stateMap[readyState] || 'unknown',
    isConnected: readyState === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
};

export default { connectDB, getDBStatus };

