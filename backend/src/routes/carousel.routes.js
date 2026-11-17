import express from 'express';
import {
  generateCarousel,
  getCarouselById,
  getCarouselsByDraft,
  updateCarousel,
  updateSlide,
  regenerateSlide,
  renderCarousel,
  exportZip,
  exportSlidePng,
  deleteCarousel
} from '../controllers/carousel.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All carousel routes require authentication
router.use(authenticate);

router.post('/generate', generateCarousel);
router.get('/drafts/:draftId', getCarouselsByDraft);
router.get('/:id', getCarouselById);
router.put('/:id', updateCarousel);
router.delete('/:id', deleteCarousel);

router.patch('/:id/slides/:slideIndex', updateSlide);
router.post('/:id/slides/:slideIndex/regenerate', regenerateSlide);
router.post('/:id/render', renderCarousel);
router.get('/:id/export/zip', exportZip);
router.get('/:id/slides/:slideIndex/png', exportSlidePng);

export default router;
