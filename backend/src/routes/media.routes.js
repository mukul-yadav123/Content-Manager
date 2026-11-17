import { Router } from 'express';
import mediaController from '../controllers/media.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { aiGenerationLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import {
  generateImageSchema,
  generateVariationSchema,
  generatePromptSchema
} from '../schemas/media.schema.js';

const router = Router();

// All media endpoints require authentication
router.use(authenticate);

// Generate image for a draft
router.post('/generate', aiGenerationLimiter, validate({ body: generateImageSchema }), mediaController.generateImage);

// Generate variation for a draft
router.post('/drafts/:draftId/variation', aiGenerationLimiter, validate({ body: generateVariationSchema }), mediaController.generateVariation);

// Generate/Regenerate detailed visual prompt only
router.post('/generate-prompt', aiGenerationLimiter, validate({ body: generatePromptSchema }), mediaController.generatePromptOnly);

// Get all media assets for a draft
router.get('/drafts/:draftId', mediaController.getDraftMedia);

// Select preferred image
router.patch('/:id/select', mediaController.selectPreferredImage);

// Get single media asset
router.get('/:id', mediaController.getMediaById);

// Delete media asset
router.delete('/:id', mediaController.deleteMediaAsset);

export default router;

