import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { User } from '../models/User.js';

/**
 * Authentication Middleware
 * Validates JWT from httpOnly cookies or Authorization Bearer header
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  // 1. Check cookies first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 3. Check query parameter token (for direct stream exports, ZIP/PNG downloads)
  else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication required. Please log in.');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Fetch user and ensure account is active
    const user = await User.findById(decoded.id);

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists.');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('This user account has been deactivated.');
    }

    // Attach user to request context
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session has expired. Please log in again.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid authentication token.');
    }
    throw error;
  }
});

/**
 * Role-Based Access Control Middleware
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to access this resource'));
    }

    return next();
  };
};

export default {
  authenticate,
  requireRole
};

