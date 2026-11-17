import { ZodError } from 'zod';
import mongoose from 'mongoose';
import ApiError from '../utils/apiError.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    error = new ApiError(400, 'Validation Error', formattedErrors);
  }
  // Handle Mongoose Validation Errors
  else if (err instanceof mongoose.Error.ValidationError) {
    const formattedErrors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message
    }));
    error = new ApiError(400, 'Database Validation Error', formattedErrors);
  }
  // Handle Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    error = new ApiError(409, `Duplicate value entered for ${field}`);
  }
  // Handle generic / unhandled errors
  else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  // Log error with Winston
  logger.error(
    `${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}${
      error.errors?.length ? ` : ${JSON.stringify(error.errors)}` : ''
    }`
  );
  if (error.statusCode === 500 && error.stack) {
    logger.error(error.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(env.NODE_ENV === 'development' && { stack: error.stack })
  };

  return res.status(error.statusCode).json(response);
};

export default errorHandler;

