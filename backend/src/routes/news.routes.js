import { Router } from 'express';
import {
  discoverNews,
  getNews,
  getNewsById,
  evaluateNews,
  evaluateBatchNews,
  researchNewsStory,
  getNewsResearch,
  updateNewsResearch,
  approveNews,
  rejectNews,
  updateNews,
  deleteNews,
  deleteAllNews
} from '../controllers/news.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.js';
import {
  discoverNewsSchema,
  newsQuerySchema,
  updateNewsSchema,
  evaluateNewsSchema,
  evaluateBatchSchema,
  rejectNewsSchema,
  updateResearchSchema
} from '../schemas/news.schema.js';

const router = Router();

// All news operations require authentication
router.use(authenticate);

// Discovery
router.post('/discover', validate({ body: discoverNewsSchema }), discoverNews);

// Evaluation & Batch Evaluation
router.post('/evaluate-batch', validate({ body: evaluateBatchSchema }), evaluateBatchNews);
router.post('/:id/evaluate', validate({ body: evaluateNewsSchema }), evaluateNews);

// AI Deep Research & Fact-Checking
router.post('/:id/research', researchNewsStory);
router.get('/:id/research', getNewsResearch);
router.patch('/:id/research', validate({ body: updateResearchSchema }), updateNewsResearch);

// Manual Approve & Reject Actions
router.patch('/:id/approve', approveNews);
router.patch('/:id/reject', validate({ body: rejectNewsSchema }), rejectNews);

// Feed & CRUD Operations
router.get('/', validate({ query: newsQuerySchema }), getNews);
router.delete('/', deleteAllNews);
router.get('/:id', getNewsById);
router.patch('/:id', validate({ body: updateNewsSchema }), updateNews);
router.delete('/:id', deleteNews);

export default router;
