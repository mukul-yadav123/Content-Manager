import Carousel from '../models/Carousel.js';
import ContentDraft from '../models/ContentDraft.js';
import NewsArticle from '../models/NewsArticle.js';
import {
  generateCarouselContent,
  regenerateSingleSlide
} from '../services/ai/carouselGeneration.service.js';
import {
  renderCarouselSlides,
  createCarouselZipStream,
  buildSlideHtml,
  renderSlideBuffer
} from '../services/renderer/htmlSlideRenderer.service.js';
import {
  generateCarouselSchema,
  updateCarouselSchema,
  updateSlideSchema,
  regenerateSlideSchema
} from '../schemas/carousel.schema.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

/**
 * @desc Generate a 5-7 slide carousel from draft or news story
 * @route POST /api/carousels/generate
 * @access Private
 */
export const generateCarousel = asyncHandler(async (req, res) => {
  const parsed = generateCarouselSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation Error', parsed.error.issues);
  }

  const { draftId, articleId, slideCount, theme, aspectRatio, customInstructions } = parsed.data;

  // Validate ownership
  if (draftId) {
    const draft = await ContentDraft.findOne({ _id: draftId, userId: req.user._id });
    if (!draft) {
      throw new ApiError(404, 'Content draft not found or unauthorized');
    }
  }

  if (articleId) {
    const article = await NewsArticle.findOne({ _id: articleId, userId: req.user._id });
    if (!article) {
      throw new ApiError(404, 'News article not found or unauthorized');
    }
  }

  const carousel = await generateCarouselContent({
    draftId,
    articleId,
    slideCount,
    theme,
    aspectRatio,
    customInstructions,
    user: req.user
  });

  return res
    .status(201)
    .json(ApiResponse.created(carousel, 'Carousel generated successfully'));
});

/**
 * @desc Get carousel by ID
 * @route GET /api/carousels/:id
 * @access Private
 */
export const getCarouselById = asyncHandler(async (req, res) => {
  const carousel = await Carousel.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!carousel) {
    throw new ApiError(404, 'Carousel not found');
  }

  return res
    .status(200)
    .json(ApiResponse.success(carousel, 'Carousel retrieved successfully'));
});

/**
 * @desc Get carousels associated with a content draft
 * @route GET /api/carousels/drafts/:draftId
 * @access Private
 */
export const getCarouselsByDraft = asyncHandler(async (req, res) => {
  const carousels = await Carousel.find({
    contentDraftId: req.params.draftId,
    userId: req.user._id
  }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(ApiResponse.success(carousels, 'Carousels retrieved successfully'));
});

/**
 * @desc Update carousel details or theme
 * @route PUT /api/carousels/:id
 * @access Private
 */
export const updateCarousel = asyncHandler(async (req, res) => {
  const parsed = updateCarouselSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation Error', parsed.error.issues);
  }

  const carousel = await Carousel.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!carousel) {
    throw new ApiError(404, 'Carousel not found');
  }

  const { title, theme, aspectRatio, status, slides } = parsed.data;

  if (title) carousel.title = title;
  if (theme && theme !== carousel.theme) {
    carousel.theme = theme;
    carousel.isRendered = false; // Requires re-rendering
  }
  if (aspectRatio && aspectRatio !== carousel.aspectRatio) {
    carousel.aspectRatio = aspectRatio;
    carousel.dimensions =
      aspectRatio === '1:1'
        ? { width: 1080, height: 1080 }
        : { width: 1080, height: 1350 };
    carousel.isRendered = false;
  }
  if (status) carousel.status = status;
  if (slides && Array.isArray(slides)) {
    carousel.slides = slides;
    carousel.slideCount = slides.length;
    carousel.isRendered = false;
  }

  await carousel.save();

  return res
    .status(200)
    .json(ApiResponse.success(carousel, 'Carousel updated successfully'));
});

/**
 * @desc Update a single slide in a carousel
 * @route PATCH /api/carousels/:id/slides/:slideIndex
 * @access Private
 */
export const updateSlide = asyncHandler(async (req, res) => {
  const slideIndex = parseInt(req.params.slideIndex, 10);
  if (isNaN(slideIndex) || slideIndex < 0) {
    throw new ApiError(400, 'Invalid slide index');
  }

  const parsed = updateSlideSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation Error', parsed.error.issues);
  }

  const carousel = await Carousel.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!carousel) {
    throw new ApiError(404, 'Carousel not found');
  }

  if (!carousel.slides[slideIndex]) {
    throw new ApiError(404, `Slide at index ${slideIndex} not found`);
  }

  // Update slide fields
  const slide = carousel.slides[slideIndex];
  slide.heading = parsed.data.heading;
  if (parsed.data.subheading !== undefined) slide.subheading = parsed.data.subheading;
  if (parsed.data.bodyText !== undefined) slide.bodyText = parsed.data.bodyText;
  if (parsed.data.bulletPoints) slide.bulletPoints = parsed.data.bulletPoints;
  if (parsed.data.categoryBadge) slide.categoryBadge = parsed.data.categoryBadge;
  if (parsed.data.statCallout) slide.statCallout = parsed.data.statCallout;
  if (parsed.data.visualConcept) slide.visualConcept = parsed.data.visualConcept;
  if (parsed.data.iconName) slide.iconName = parsed.data.iconName;

  carousel.isRendered = false; // Invalidate previous renders
  await carousel.save();

  return res
    .status(200)
    .json(ApiResponse.success(carousel, 'Slide updated successfully'));
});

/**
 * @desc Regenerate a single slide with AI
 * @route POST /api/carousels/:id/slides/:slideIndex/regenerate
 * @access Private
 */
export const regenerateSlide = asyncHandler(async (req, res) => {
  const slideIndex = parseInt(req.params.slideIndex, 10);
  if (isNaN(slideIndex) || slideIndex < 0) {
    throw new ApiError(400, 'Invalid slide index');
  }

  const parsed = regenerateSlideSchema.safeParse(req.body || {});
  if (!parsed.success) {
    throw new ApiError(400, 'Validation Error', parsed.error.issues);
  }

  const carousel = await Carousel.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!carousel) {
    throw new ApiError(404, 'Carousel not found');
  }

  if (!carousel.slides[slideIndex]) {
    throw new ApiError(404, `Slide at index ${slideIndex} not found`);
  }

  const updatedSlide = await regenerateSingleSlide({
    carousel,
    slideIndex,
    instructions: parsed.data.instructions,
    user: req.user
  });

  return res
    .status(200)
    .json(
      ApiResponse.success(
        { slide: updatedSlide, carousel },
        'Slide regenerated successfully'
      )
    );
});

/**
 * @desc Render all slides to high-quality PNGs and upload to Cloudinary
 * @route POST /api/carousels/:id/render
 * @access Private
 */
export const renderCarousel = asyncHandler(async (req, res) => {
  const carousel = await Carousel.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!carousel) {
    throw new ApiError(404, 'Carousel not found');
  }

  const renderedCarousel = await renderCarouselSlides(carousel, req.user);

  return res
    .status(200)
    .json(
      ApiResponse.success(
        renderedCarousel,
        'Carousel slides rendered and exported successfully'
      )
    );
});

/**
 * @desc Download all slides as a ZIP file
 * @route GET /api/carousels/:id/export/zip
 * @access Private
 */
export const exportZip = asyncHandler(async (req, res) => {
  const carousel = await Carousel.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!carousel) {
    throw new ApiError(404, 'Carousel not found');
  }

  const safeFilename = `carousel-${carousel.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

  const zipStream = await createCarouselZipStream(carousel, req.user);
  zipStream.pipe(res);
});

/**
 * @desc Download an individual slide as a high-quality PNG
 * @route GET /api/carousels/:id/slides/:slideIndex/png
 * @access Private
 */
export const exportSlidePng = asyncHandler(async (req, res) => {
  const slideIndex = parseInt(req.params.slideIndex, 10);
  if (isNaN(slideIndex) || slideIndex < 0) {
    throw new ApiError(400, 'Invalid slide index');
  }

  const carousel = await Carousel.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!carousel) {
    throw new ApiError(404, 'Carousel not found');
  }

  const slide = carousel.slides[slideIndex];
  if (!slide) {
    throw new ApiError(404, 'Slide not found');
  }

  const html = buildSlideHtml(slide, carousel, req.user);
  const buffer = await renderSlideBuffer(html, carousel.dimensions);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="slide-${String(slide.slideNumber).padStart(2, '0')}.png"`
  );

  return res.send(buffer);
});

/**
 * @desc Delete carousel
 * @route DELETE /api/carousels/:id
 * @access Private
 */
export const deleteCarousel = asyncHandler(async (req, res) => {
  const carousel = await Carousel.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!carousel) {
    throw new ApiError(404, 'Carousel not found');
  }

  // Remove reference from draft if applicable
  if (carousel.contentDraftId) {
    await ContentDraft.updateOne(
      { _id: carousel.contentDraftId },
      { $set: { carouselId: null, carouselSlides: [] } }
    );
  }

  return res
    .status(200)
    .json(ApiResponse.success(null, 'Carousel deleted successfully'));
});

