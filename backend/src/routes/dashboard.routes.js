import { Router } from 'express';
import {
  getDashboardOverview,
  updateDraftStatus,
  toggleArticleInteresting
} from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Protected dashboard routes
router.use(authenticate);

router.get('/overview', getDashboardOverview);
router.patch('/posts/:id/status', updateDraftStatus);
router.patch('/news/:id/toggle-interesting', toggleArticleInteresting);

export default router;

