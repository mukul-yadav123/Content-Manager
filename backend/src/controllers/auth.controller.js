import { User } from '../models/User.js';
import { WritingProfile } from '../models/WritingProfile.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

// Cookie configuration for JWT token
const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
});

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, headline, bio } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.badRequest('An account with this email address already exists.');
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    headline: headline || '',
    bio: bio || '',
    lastLoginAt: new Date()
  });

  // Automatically provision a default Writing Profile for the new user
  await WritingProfile.create({
    userId: user._id,
    profileName: 'Default Voice',
    tone: 'Authoritative yet accessible, conversational, punchy',
    targetAudience: headline || 'Founders and Industry Professionals',
    isDefault: true
  });

  // Generate auth token
  const token = user.generateAuthToken();

  // Set secure cookie
  res.cookie('token', token, getCookieOptions());

  return res.status(201).json(
    ApiResponse.created(
      {
        user,
        token
      },
      'User registered successfully'
    )
  );
});

/**
 * Log in an existing user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and explicitly select password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Please contact support.');
  }

  // Verify password
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  // Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save();

  // Generate auth token
  const token = user.generateAuthToken();

  // Set secure cookie
  res.cookie('token', token, getCookieOptions());

  return res.status(200).json(
    ApiResponse.success(
      {
        user,
        token
      },
      'Logged in successfully'
    )
  );
});

/**
 * Log out user and invalidate cookie
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', {
    ...getCookieOptions(),
    maxAge: 0
  });

  return res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
});

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user was attached by authenticate middleware
  return res.status(200).json(
    ApiResponse.success(
      {
        user: req.user
      },
      'User profile fetched successfully'
    )
  );
});

export default {
  register,
  login,
  logout,
  getCurrentUser
};

