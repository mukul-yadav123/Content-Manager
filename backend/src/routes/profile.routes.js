import { Router } from 'express';
import profileController from '../controllers/profile.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  analyzeSamplesSchema,
  updateProfileSchema,
  addSampleSchema
} from '../schemas/profile.schema.js';

const router = Router();

// All profile endpoints require authentication
router.use(authenticate);

// Get current profile & learned suggestions
router.get('/', profileController.getProfile);

// Analyze 5-10 samples with forensic AI
router.post('/analyze', validate({ body: analyzeSamplesSchema }), profileController.analyzeSamples);

// Update profile manually
router.put('/', validate({ body: updateProfileSchema }), profileController.updateProfile);

// Add sample
router.post('/samples', validate({ body: addSampleSchema }), profileController.addSample);

// Accept or dismiss learned suggestion
router.post('/suggestions/:id', profileController.handleSuggestion);

// Reset default profile
router.post('/reset-default', profileController.resetDefaultProfile);

export default router;

