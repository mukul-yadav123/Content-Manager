import { Router } from 'express';
import {
  getTopics,
  getTopicMetadata,
  getTopicById,
  createTopic,
  updateTopic,
  toggleTopicStatus,
  deleteTopic
} from '../controllers/topic.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.js';
import {
  createTopicSchema,
  updateTopicSchema,
  topicQuerySchema
} from '../schemas/topic.schema.js';

const router = Router();

// All topic operations require authentication
router.use(authenticate);

router.get('/', validate({ query: topicQuerySchema }), getTopics);
router.get('/categories', getTopicMetadata);
router.get('/:id', getTopicById);
router.post('/', validate({ body: createTopicSchema }), createTopic);
router.put('/:id', validate({ body: updateTopicSchema }), updateTopic);
router.patch('/:id/toggle', toggleTopicStatus);
router.delete('/:id', deleteTopic);

export default router;

