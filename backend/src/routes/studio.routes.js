import { Router } from 'express';
import studioController from '../controllers/studio.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  generatePostsSchema,
  selectVariationSchema,
  regenerateHooksSchema,
  regeneratePostSchema,
  changeAngleSchema,
  updateDraftSchema,
  draftsQuerySchema
} from '../schemas/studio.schema.js';

const router = Router();

// All studio routes require authentication
router.use(authenticate);

// Generate 3 LinkedIn post approaches
router.post('/generate', validate({ body: generatePostsSchema }), studioController.generatePosts);

// Query drafts
router.get('/drafts', validate({ query: draftsQuerySchema }), studioController.getDrafts);

// Single draft
router.get('/drafts/:id', studioController.getDraftById);

// Select variation & hook
router.patch('/drafts/:id/select-variation', validate({ body: selectVariationSchema }), studioController.selectVariation);

// Regenerate hooks for approach
router.post('/drafts/:id/regenerate-hooks', validate({ body: regenerateHooksSchema }), studioController.regenerateHooks);

// Regenerate single approach post
router.post('/drafts/:id/regenerate-post', validate({ body: regeneratePostSchema }), studioController.regeneratePost);

// Change content angle
router.patch('/drafts/:id/angle', validate({ body: changeAngleSchema }), studioController.changeAngle);

// Update draft manual edits
router.put('/drafts/:id', validate({ body: updateDraftSchema }), studioController.updateDraft);

// Delete draft
router.delete('/drafts/:id', studioController.deleteDraft);

export default router;

