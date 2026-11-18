import MediaAsset from '../models/MediaAsset.js';
import ContentDraft from '../models/ContentDraft.js';
import NewsArticle from '../models/NewsArticle.js';
import Topic from '../models/Topic.js';
import imageGenerationService from '../services/ai/imageGeneration.service.js';
import cloudinaryService from '../services/storage/cloudinary.service.js';
import { trackGenerationJob } from '../utils/jobTracker.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

/**
 * Generate a new image for a LinkedIn post draft
 * POST /api/media/generate
 */
export const generateImage = asyncHandler(async (req, res) => {
  const {
    draftId,
    style,
    imageStyle,
    customPrompt = '',
    concept = '',
    aspectRatio = '1:1'
  } = req.body;

  const activeStyle = style || imageStyle || 'editorial';

  // 1. Verify Draft Ownership
  const draft = await ContentDraft.findOne({
    _id: draftId,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Content draft not found');
  }

  // 2. Resolve target visual concept from payload, selected variation, or draft
  const activeVariation = draft.variations?.find((v) => v.approach === draft.selectedApproach) || draft.variations?.[0];
  const targetConcept =
    (concept && concept.trim()) ||
    activeVariation?.suggestedImageConcept ||
    draft.suggestedImageConcept ||
    '';

  // 3. Fetch associated Article and Topic if available
  let article = null;
  let topic = null;
  if (draft.newsArticleId) {
    article = await NewsArticle.findById(draft.newsArticleId);
  }
  if (draft.topicId) {
    topic = await Topic.findById(draft.topicId);
  }

  logger.info(`Generating ${activeStyle} image for draft "${draft.title}" with concept: "${targetConcept.substring(0, 50)}..." (User: ${req.user._id})`);

  // 4. Generate and Save Media Asset wrapped in GenerationJob lifecycle
  const mediaAsset = await trackGenerationJob({
    userId: req.user._id,
    jobType: 'image-generation',
    inputParams: { draftId, style: activeStyle, customPrompt, concept: targetConcept, aspectRatio },
    targetDraftId: draft._id,
    targetArticleId: draft.newsArticleId || null,
    execute: async () => {
      return await imageGenerationService.generateAndSavePostImage({
        draft,
        article,
        topic,
        style: activeStyle,
        customPrompt,
        concept: targetConcept,
        aspectRatio,
        userId: req.user._id
      });
    }
  });

  return res.status(201).json(ApiResponse.created(mediaAsset, 'LinkedIn post image generated and uploaded successfully'));
});

/**
 * Generate another image variation for a draft
 * POST /api/media/drafts/:draftId/variation
 */
export const generateVariation = asyncHandler(async (req, res) => {
  const { draftId } = req.params;
  const {
    style,
    imageStyle,
    customPrompt = '',
    concept = '',
    aspectRatio = '1:1'
  } = req.body;

  const activeStyle = style || imageStyle || 'editorial';

  const draft = await ContentDraft.findOne({
    _id: draftId,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Content draft not found');
  }

  const activeVariation = draft.variations?.find((v) => v.approach === draft.selectedApproach) || draft.variations?.[0];
  const targetConcept =
    (concept && concept.trim()) ||
    activeVariation?.suggestedImageConcept ||
    draft.suggestedImageConcept ||
    '';

  let article = null;
  let topic = null;
  if (draft.newsArticleId) {
    article = await NewsArticle.findById(draft.newsArticleId);
  }
  if (draft.topicId) {
    topic = await Topic.findById(draft.topicId);
  }

  logger.info(`Generating variation (${activeStyle}) for draft "${draft.title}" with concept: "${targetConcept.substring(0, 50)}..."`);

  const mediaAsset = await imageGenerationService.generateAndSavePostImage({
    draft,
    article,
    topic,
    style: activeStyle,
    customPrompt,
    concept: targetConcept,
    aspectRatio,
    userId: req.user._id
  });

  return res.status(201).json(ApiResponse.created(mediaAsset, 'New image variation generated successfully'));
});

/**
 * Synthesize/Regenerate detailed image prompt and concept only (without generating image)
 * POST /api/media/generate-prompt
 */
export const generatePromptOnly = asyncHandler(async (req, res) => {
  const { draftId, style, imageStyle, concept = '' } = req.body;
  const activeStyle = style || imageStyle || 'editorial';

  const draft = await ContentDraft.findOne({
    _id: draftId,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Content draft not found');
  }

  const activeVariation = draft.variations?.find((v) => v.approach === draft.selectedApproach) || draft.variations?.[0];
  const targetConcept =
    (concept && concept.trim()) ||
    activeVariation?.suggestedImageConcept ||
    draft.suggestedImageConcept ||
    '';

  let article = null;
  let topic = null;
  if (draft.newsArticleId) {
    article = await NewsArticle.findById(draft.newsArticleId);
  }
  if (draft.topicId) {
    topic = await Topic.findById(draft.topicId);
  }

  const promptData = await imageGenerationService.synthesizeImagePrompt({
    draft,
    article,
    topic,
    style: activeStyle,
    concept: targetConcept
  });

  return res.status(200).json(ApiResponse.success(promptData, 'Detailed visual prompt generated successfully'));
});

/**
 * Get all media assets associated with a specific post draft
 * GET /api/media/drafts/:draftId
 */
export const getDraftMedia = asyncHandler(async (req, res) => {
  const { draftId } = req.params;

  const draft = await ContentDraft.findOne({
    _id: draftId,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Content draft not found');
  }

  const assets = await MediaAsset.find({
    contentDraftId: draftId,
    userId: req.user._id
  }).sort({ createdAt: -1 });

  return res.status(200).json(
    ApiResponse.success(
      {
        items: assets,
        mediaAssets: assets,
        selectedMediaAssetId: draft.selectedMediaAsset,
        total: assets.length
      },
      'Media assets retrieved successfully'
    )
  );
});

/**
 * Select a preferred image for a post draft
 * PATCH /api/media/:id/select
 */
export const selectPreferredImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const mediaAsset = await MediaAsset.findOne({
    _id: id,
    userId: req.user._id
  });

  if (!mediaAsset) {
    throw ApiError.notFound('Media asset not found');
  }

  const draft = await ContentDraft.findOne({
    _id: mediaAsset.contentDraftId,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Associated draft not found');
  }

  // Update preferred flag on all assets for this draft
  await MediaAsset.updateMany(
    { contentDraftId: draft._id, userId: req.user._id },
    { $set: { isPreferred: false } }
  );

  mediaAsset.isPreferred = true;
  await mediaAsset.save();

  // Set selectedMediaAsset on draft
  draft.selectedMediaAsset = mediaAsset._id;
  await draft.save();

  return res.status(200).json(ApiResponse.success(mediaAsset, 'Preferred post image selected successfully'));
});

/**
 * Delete a media asset
 * DELETE /api/media/:id
 */
export const deleteMediaAsset = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const mediaAsset = await MediaAsset.findOne({
    _id: id,
    userId: req.user._id
  });

  if (!mediaAsset) {
    throw ApiError.notFound('Media asset not found');
  }

  // 1. Delete from Cloudinary
  try {
    await cloudinaryService.deleteImage(mediaAsset.publicId);
  } catch (err) {
    logger.warn(`Could not delete from Cloudinary: ${err.message}`);
  }

  // 2. Remove reference from ContentDraft
  const draft = await ContentDraft.findById(mediaAsset.contentDraftId);
  if (draft) {
    draft.mediaAssets = draft.mediaAssets.filter((aId) => aId.toString() !== id);
    if (draft.selectedMediaAsset && draft.selectedMediaAsset.toString() === id) {
      draft.selectedMediaAsset = draft.mediaAssets[0] || null;
      if (draft.selectedMediaAsset) {
        await MediaAsset.findByIdAndUpdate(draft.selectedMediaAsset, { isPreferred: true });
      }
    }
    await draft.save();
  }

  // 3. Delete from MongoDB
  await MediaAsset.findByIdAndDelete(id);

  return res.status(200).json(ApiResponse.success(null, 'Media asset deleted successfully'));
});

/**
 * Get single media asset by ID
 * GET /api/media/:id
 */
export const getMediaById = asyncHandler(async (req, res) => {
  const mediaAsset = await MediaAsset.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!mediaAsset) {
    throw ApiError.notFound('Media asset not found');
  }

  return res.status(200).json(ApiResponse.success(mediaAsset, 'Media asset retrieved successfully'));
});

export default {
  generateImage,
  generateVariation,
  generatePromptOnly,
  getDraftMedia,
  selectPreferredImage,
  deleteMediaAsset,
  getMediaById
};

