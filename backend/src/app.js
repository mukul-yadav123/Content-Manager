import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import apiRouter from './routes/index.js';
import ApiError from './utils/apiError.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  })
);

// Body parsing middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// HTTP Request logging
app.use(requestLogger);

// Apply rate limiter to all API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api', apiRouter);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;

