import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import topicRoutes from './topic.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import newsRoutes from './news.routes.js';
import studioRoutes from './studio.routes.js';
import profileRoutes from './profile.routes.js';

const router = Router();

// Mount Health Check routes
router.use('/health', healthRoutes);

// Mount Authentication routes
router.use('/auth', authRoutes);

// Mount Topic Management routes
router.use('/topics', topicRoutes);

// Mount News Discovery routes
router.use('/news', newsRoutes);

// Mount Writing Profile routes
router.use('/profile', profileRoutes);

// Mount Studio & Content Generation routes
router.use('/studio', studioRoutes);

// Mount Dashboard Statistics routes
router.use('/dashboard', dashboardRoutes);

export default router;

