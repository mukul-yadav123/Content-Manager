import { Router } from 'express';
import { getPing, getReadiness } from '../controllers/health.controller.js';
import validate from '../middlewares/validate.js';
import { healthCheckQuerySchema } from '../schemas/health.schema.js';

const router = Router();

router.get('/ping', validate({ query: healthCheckQuerySchema }), getPing);
router.get('/ready', getReadiness);

export default router;

