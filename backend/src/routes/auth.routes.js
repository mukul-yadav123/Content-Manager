import { Router } from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import validate from '../middlewares/validate.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';

const router = Router();

// Public Authentication Routes
router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/logout', logout);

// Protected User Profile Route
router.get('/me', authenticate, getCurrentUser);

export default router;

