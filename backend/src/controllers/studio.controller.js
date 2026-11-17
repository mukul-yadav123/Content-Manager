import ContentDraft from '../models/ContentDraft.js';
import NewsArticle from '../models/NewsArticle.js';
import Topic from '../models/Topic.js';
import WritingProfile from '../models/WritingProfile.js';
import postGenerationService from '../services/ai/postGeneration.service.js';
import humanizationService from '../services/ai/humanization.service.js';
import editLearningService from '../services/ai/editLearning.service.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
import { getPaginationOptions, formatPaginatedResponse } from '../utils/pagination.js';

/**
 * Generate 3 LinkedIn post approaches for a researched news article
 * POST /api/studio/generate
 */
export const generatePosts = asyncHandler(async (req, res) => {
  const {
    articleId,
    targetAudience = 'Industry professionals and decision makers',
    contentAngle = '',
    preferredStyle = 'authoritative',
    postFormat = 'standard'
  } = req.body;

  // 1. Fetch news article and verify accessibility
  const article = await NewsArticle.findOne({
    _id: articleId,
    $or: [{ userId: req.user._id }, { userId: { $exists: false } }, { userId: null }]
  });

  if (!article) {
    throw ApiError.notFound('News article not found');
  }

  // 2. Fetch associated topic if present
  let topic = null;
  if (article.topicId) {
    topic = await Topic.findById(article.topicId);
  }

  logger.info(`Generating LinkedIn post variations for article "${article.title}" (User: ${req.user._id})`);

  // 3. Call generation service to produce the 3 approaches in one run
  const generationResult = await postGenerationService.generateLinkedInPosts({
    article,
    research: article.deepResearch,
    topic,
    targetAudience,
    contentAngle,
    preferredStyle,
    postFormat
  });

  const { variations } = generationResult;
  if (!variations || variations.length === 0) {
    throw ApiError.internal('Failed to generate post variations');
  }

  // 4. Set the default selected approach (news_update)
  const defaultVar = variations.find((v) => v.approach === 'news_update') || variations[0];
  const initialHook = defaultVar.selectedHook || defaultVar.hookOptions[0] || 'Important industry update:';
  const initialBody = defaultVar.content;
  const initialCta = defaultVar.closingQuestion || '';
  const initialTags = defaultVar.hashtags || [];

  // 5. Calculate counts
  const fullText = `${initialHook}\n\n${initialBody}\n\n${initialCta}`;
  const characterCount = fullText.length;
  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  const initialDraftPayload = {
    hook: initialHook,
    body: initialBody,
    cta: initialCta,
    hashtags: initialTags
  };

  const initialVersion = {
    versionId: `ver-initial-${Date.now()}`,
    versionType: 'initial',
    title: defaultVar.headline || article.title,
    hook: initialHook,
    body: initialBody,
    cta: initialCta,
    hashtags: initialTags,
    humanizationMode: 'none',
    createdAt: new Date(),
    note: `Initial AI generation (${defaultVar.approachLabel || defaultVar.approach})`
  };

  // 6. Create ContentDraft document
  const draft = await ContentDraft.create({
    userId: req.user._id,
    topicId: article.topicId || null,
    newsArticleId: article._id,
    title: defaultVar.headline || article.title,
    hook: initialHook,
    body: initialBody,
    cta: initialCta,
    hashtags: initialTags,
    format: postFormat || 'standard',
    status: 'draft',
    variations,
    selectedApproach: defaultVar.approach,
    targetAudience,
    contentAngle,
    preferredStyle,
    isHumanized: false,
    initialDraft: initialDraftPayload,
    versions: [initialVersion],
    keyTakeaways: defaultVar.keyTakeaways || [],
    closingQuestion: defaultVar.closingQuestion || '',
    sourceAttribution: defaultVar.sourceAttribution || '',
    suggestedImageConcept: defaultVar.suggestedImageConcept || '',
    characterCount,
    wordCount
  });

  // 7. Update news article status to 'drafted' or 'selected'
  if (['discovered', 'evaluated', 'shortlisted'].includes(article.status)) {
    article.status = 'selected';
    await article.save();
  }

  return res.status(201).json(ApiResponse.created(draft, 'LinkedIn post variations generated successfully'));
});

/**
 * Get paginated drafts for the current user
 * GET /api/studio/drafts
 */
export const getDrafts = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPaginationOptions(req.query, 10, 50);

  const filter = { userId: req.user._id };

  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }
  if (req.query.topicId) {
    filter.topicId = req.query.topicId;
  }
  if (req.query.newsArticleId) {
    filter.newsArticleId = req.query.newsArticleId;
  }
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { hook: { $regex: req.query.search, $options: 'i' } },
      { body: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const [drafts, total] = await Promise.all([
    ContentDraft.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('topicId', 'name category')
      .populate('newsArticleId', 'title publisher sourceUrl publishedAt relevanceScore')
      .lean(),
    ContentDraft.countDocuments(filter)
  ]);

  const paginatedResponse = formatPaginatedResponse({
    items: drafts,
    total,
    page,
    limit
  });

  return res.status(200).json(ApiResponse.success(paginatedResponse, 'Drafts retrieved successfully'));
});

/**
 * Get single draft by ID with all 3 variations and version snapshots
 * GET /api/studio/drafts/:id
 */
export const getDraftById = asyncHandler(async (req, res) => {
  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  })
    .populate('topicId', 'name category')
    .populate('newsArticleId', 'title publisher sourceUrl publishedAt deepResearch relevanceScore');

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  return res.status(200).json(ApiResponse.success(draft, 'Draft retrieved successfully'));
});

/**
 * Select active approach variation and/or hook
 * PATCH /api/studio/drafts/:id/select-variation
 */
export const selectVariation = asyncHandler(async (req, res) => {
  const { approach, selectedHook } = req.body;

  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  const variation = draft.variations.find((v) => v.approach === approach);
  if (!variation) {
    throw ApiError.badRequest(`Variation for approach "${approach}" not found in draft`);
  }

  // Update selected hook on variation if specified
  const chosenHook = selectedHook || variation.selectedHook || variation.hookOptions[0];
  variation.selectedHook = chosenHook;

  // Synchronize primary active post fields
  draft.selectedApproach = approach;
  draft.title = variation.headline || draft.title;
  draft.hook = chosenHook;
  draft.body = variation.content;
  draft.cta = variation.closingQuestion || draft.cta;
  draft.hashtags = variation.hashtags || [];
  draft.keyTakeaways = variation.keyTakeaways || [];
  draft.closingQuestion = variation.closingQuestion || '';
  draft.sourceAttribution = variation.sourceAttribution || '';
  draft.suggestedImageConcept = variation.suggestedImageConcept || '';

  const fullText = `${draft.hook}\n\n${draft.body}\n\n${draft.cta}`;
  draft.characterCount = fullText.length;
  draft.wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  await draft.save();

  return res.status(200).json(
    ApiResponse.success(draft, `Switched active approach to ${variation.approachLabel || approach}`)
  );
});

/**
 * Regenerate 3 new hooks for a specific approach
 * POST /api/studio/drafts/:id/regenerate-hooks
 */
export const regenerateHooks = asyncHandler(async (req, res) => {
  const { approach, contentAngle, targetAudience } = req.body;

  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  const targetApproach = approach || draft.selectedApproach || 'news_update';
  const variation = draft.variations.find((v) => v.approach === targetApproach);
  if (!variation) {
    throw ApiError.badRequest(`Variation for approach "${targetApproach}" not found in draft`);
  }

  const article = await NewsArticle.findById(draft.newsArticleId);
  if (!article) {
    throw ApiError.notFound('Associated news article not found');
  }

  const newHooks = await postGenerationService.regenerateHooksForApproach({
    approach: targetApproach,
    article,
    currentPostContent: variation.content,
    targetAudience: targetAudience || draft.targetAudience,
    contentAngle: contentAngle || draft.contentAngle
  });

  // Update hook options
  variation.hookOptions = newHooks;
  variation.selectedHook = newHooks[0];

  // If active approach matches, update draft hook
  if (draft.selectedApproach === targetApproach) {
    draft.hook = newHooks[0];
    const fullText = `${draft.hook}\n\n${draft.body}\n\n${draft.cta}`;
    draft.characterCount = fullText.length;
    draft.wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
  }

  await draft.save();

  return res.status(200).json(
    ApiResponse.success(
      {
        approach: targetApproach,
        hookOptions: newHooks,
        selectedHook: newHooks[0],
        draft
      },
      'New hook options generated successfully'
    )
  );
});

/**
 * Regenerate post content for an approach or all approaches
 * POST /api/studio/drafts/:id/regenerate-post
 */
export const regeneratePost = asyncHandler(async (req, res) => {
  const { approach, contentAngle, targetAudience, preferredStyle } = req.body;

  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  const article = await NewsArticle.findById(draft.newsArticleId);
  if (!article) {
    throw ApiError.notFound('Associated news article not found');
  }

  const targetApproach = approach || draft.selectedApproach || 'news_update';
  let topic = null;
  if (draft.topicId) {
    topic = await Topic.findById(draft.topicId);
  }

  // Regenerate single approach
  const updatedVariation = await postGenerationService.regenerateSingleApproach({
    approach: targetApproach,
    article,
    research: article.deepResearch,
    topic,
    targetAudience: targetAudience || draft.targetAudience,
    contentAngle: contentAngle || draft.contentAngle,
    preferredStyle: preferredStyle || draft.preferredStyle
  });

  // Replace variation in draft
  const index = draft.variations.findIndex((v) => v.approach === targetApproach);
  if (index !== -1) {
    draft.variations[index] = updatedVariation;
  } else {
    draft.variations.push(updatedVariation);
  }

  // If this approach is currently active, sync active fields
  if (draft.selectedApproach === targetApproach) {
    draft.title = updatedVariation.headline || draft.title;
    draft.hook = updatedVariation.selectedHook || updatedVariation.hookOptions[0];
    draft.body = updatedVariation.content;
    draft.cta = updatedVariation.closingQuestion;
    draft.hashtags = updatedVariation.hashtags;
    draft.keyTakeaways = updatedVariation.keyTakeaways;
    draft.closingQuestion = updatedVariation.closingQuestion;
    draft.sourceAttribution = updatedVariation.sourceAttribution;
    draft.suggestedImageConcept = updatedVariation.suggestedImageConcept;

    const fullText = `${draft.hook}\n\n${draft.body}\n\n${draft.cta}`;
    draft.characterCount = fullText.length;
    draft.wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
  }

  await draft.save();

  return res.status(200).json(
    ApiResponse.success(draft, `Post for ${targetApproach} regenerated successfully`)
  );
});

/**
 * Change content angle and regenerate all variations
 * PATCH /api/studio/drafts/:id/angle
 */
export const changeAngle = asyncHandler(async (req, res) => {
  const { contentAngle } = req.body;

  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  const article = await NewsArticle.findById(draft.newsArticleId);
  if (!article) {
    throw ApiError.notFound('Associated news article not found');
  }

  let topic = null;
  if (draft.topicId) {
    topic = await Topic.findById(draft.topicId);
  }

  // Re-run 3-variation generator with new content angle
  const generationResult = await postGenerationService.generateLinkedInPosts({
    article,
    research: article.deepResearch,
    topic,
    targetAudience: draft.targetAudience,
    contentAngle,
    preferredStyle: draft.preferredStyle,
    postFormat: draft.format
  });

  draft.contentAngle = contentAngle;
  draft.variations = generationResult.variations;

  // Keep existing selected approach and update active fields
  const currentVar =
    draft.variations.find((v) => v.approach === draft.selectedApproach) || draft.variations[0];

  draft.title = currentVar.headline || article.title;
  draft.hook = currentVar.selectedHook || currentVar.hookOptions[0];
  draft.body = currentVar.content;
  draft.cta = currentVar.closingQuestion;
  draft.hashtags = currentVar.hashtags;
  draft.keyTakeaways = currentVar.keyTakeaways;
  draft.closingQuestion = currentVar.closingQuestion;
  draft.sourceAttribution = currentVar.sourceAttribution;
  draft.suggestedImageConcept = currentVar.suggestedImageConcept;

  const fullText = `${draft.hook}\n\n${draft.body}\n\n${draft.cta}`;
  draft.characterCount = fullText.length;
  draft.wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  await draft.save();

  return res.status(200).json(
    ApiResponse.success(draft, 'Content angle updated and posts regenerated')
  );
});

/**
 * Humanize a draft using personal writing profile and selected intensity mode
 * POST /api/studio/drafts/:id/humanize
 */
export const humanizePost = asyncHandler(async (req, res) => {
  const { mode = 'professional', writingProfileId, tone, contentAngle } = req.body;

  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  // Fetch target writing profile
  let profile = null;
  if (writingProfileId) {
    profile = await WritingProfile.findOne({ _id: writingProfileId, userId: req.user._id });
  }
  if (!profile) {
    profile = await WritingProfile.findOne({ userId: req.user._id, isDefault: true });
    if (!profile) {
      profile = await WritingProfile.findOne({ userId: req.user._id });
    }
  }

  // Fetch article with research
  const article = await NewsArticle.findById(draft.newsArticleId);

  // Execute humanization service
  const { humanizedPost, qualityEvaluation } = await humanizationService.humanizeDraft({
    rawDraft: {
      hook: draft.hook,
      body: draft.body,
      cta: draft.cta,
      hashtags: draft.hashtags
    },
    originalResearch: article?.deepResearch,
    writingProfile: profile,
    mode,
    tone: tone || draft.preferredStyle,
    contentAngle: contentAngle || draft.contentAngle
  });

  // Store in humanizedDraft subdocument
  draft.humanizedDraft = {
    hook: humanizedPost.hook,
    body: humanizedPost.body,
    cta: humanizedPost.cta,
    hashtags: humanizedPost.hashtags,
    mode,
    humanizedAt: new Date()
  };

  draft.isHumanized = true;
  draft.humanizationMode = mode;
  draft.qualityEvaluation = qualityEvaluation;

  // Update primary active post fields to humanized version
  draft.hook = humanizedPost.hook;
  draft.body = humanizedPost.body;
  draft.cta = humanizedPost.cta;
  draft.hashtags = humanizedPost.hashtags;

  // Push new version to maintain complete history
  const versionId = `ver-human-${Date.now()}`;
  draft.versions.push({
    versionId,
    versionType: 'humanized',
    title: draft.title,
    hook: humanizedPost.hook,
    body: humanizedPost.body,
    cta: humanizedPost.cta,
    hashtags: humanizedPost.hashtags,
    humanizationMode: mode,
    qualityEvaluation,
    createdAt: new Date(),
    note: `Humanized post (${mode} mode)`
  });

  const fullText = `${draft.hook}\n\n${draft.body}\n\n${draft.cta}`;
  draft.characterCount = fullText.length;
  draft.wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  await draft.save();

  return res.status(200).json(
    ApiResponse.success(
      {
        draft,
        humanizedPost,
        qualityEvaluation,
        versionId
      },
      `Draft humanized successfully (${mode} mode)`
    )
  );
});

/**
 * Approve draft and learn from creator edit patterns
 * POST /api/studio/drafts/:id/approve
 */
export const approveDraft = asyncHandler(async (req, res) => {
  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  // Set final approved draft
  draft.finalApprovedDraft = {
    hook: draft.hook,
    body: draft.body,
    cta: draft.cta,
    hashtags: draft.hashtags,
    approvedAt: new Date()
  };
  draft.status = 'ready';

  // Push version
  draft.versions.push({
    versionId: `ver-approved-${Date.now()}`,
    versionType: 'final_approved',
    title: draft.title,
    hook: draft.hook,
    body: draft.body,
    cta: draft.cta,
    hashtags: draft.hashtags,
    createdAt: new Date(),
    note: 'Final approved post'
  });

  await draft.save();

  // Trigger non-destructive edit learning
  let newSuggestions = [];
  try {
    const profile = await WritingProfile.findOne({ userId: req.user._id, isDefault: true });
    if (profile) {
      newSuggestions = await editLearningService.synthesizeSuggestionsFromEdits({
        currentDraft: draft,
        profile
      });
    }
  } catch (err) {
    logger.warn(`Could not synthesize edit suggestions: ${err.message}`);
  }

  return res.status(200).json(
    ApiResponse.success(
      {
        draft,
        newSuggestions
      },
      'Draft approved and marked ready for publishing'
    )
  );
});

/**
 * Revert draft fields to a previous version
 * PATCH /api/studio/drafts/:id/revert-version
 */
export const revertVersion = asyncHandler(async (req, res) => {
  const { versionType, versionId } = req.body;

  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  let targetVersion = null;

  if (versionId) {
    targetVersion = draft.versions.find((v) => v.versionId === versionId);
  }

  if (!targetVersion && versionType) {
    if (versionType === 'initial' && draft.initialDraft?.body) {
      targetVersion = draft.initialDraft;
    } else if (versionType === 'humanized' && draft.humanizedDraft?.body) {
      targetVersion = draft.humanizedDraft;
    } else if (versionType === 'user_edited' && draft.userEditedDraft?.body) {
      targetVersion = draft.userEditedDraft;
    } else if (versionType === 'final_approved' && draft.finalApprovedDraft?.body) {
      targetVersion = draft.finalApprovedDraft;
    } else {
      // Find latest version matching versionType from versions array
      const matching = draft.versions.filter((v) => v.versionType === versionType);
      targetVersion = matching[matching.length - 1];
    }
  }

  if (!targetVersion || !targetVersion.body) {
    throw ApiError.notFound(`Version for "${versionType || versionId}" not found`);
  }

  // Restore fields
  draft.hook = targetVersion.hook;
  draft.body = targetVersion.body;
  draft.cta = targetVersion.cta || draft.cta;
  draft.hashtags = targetVersion.hashtags || draft.hashtags;

  const fullText = `${draft.hook}\n\n${draft.body}\n\n${draft.cta || ''}`;
  draft.characterCount = fullText.length;
  draft.wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  await draft.save();

  return res.status(200).json(
    ApiResponse.success(
      draft,
      `Reverted post to ${versionType || 'selected'} version`
    )
  );
});

/**
 * Update draft manual edits
 * PUT /api/studio/drafts/:id
 */
export const updateDraft = asyncHandler(async (req, res) => {
  const { title, hook, body, cta, hashtags, status, selectedApproach, scheduledFor } = req.body;

  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  const isContentChanged = (hook && hook !== draft.hook) || (body && body !== draft.body);

  // Record revision if hook or body changed
  if (isContentChanged) {
    draft.revisionHistory.push({
      hook: draft.hook,
      body: draft.body,
      cta: draft.cta,
      editedAt: new Date(),
      note: 'Manual edit'
    });

    draft.userEditedDraft = {
      hook: hook || draft.hook,
      body: body || draft.body,
      cta: cta !== undefined ? cta : draft.cta,
      hashtags: hashtags !== undefined ? hashtags : draft.hashtags,
      editedAt: new Date()
    };

    draft.versions.push({
      versionId: `ver-user-${Date.now()}`,
      versionType: 'user_edited',
      title: title || draft.title,
      hook: hook || draft.hook,
      body: body || draft.body,
      cta: cta !== undefined ? cta : draft.cta,
      hashtags: hashtags !== undefined ? hashtags : draft.hashtags,
      createdAt: new Date(),
      note: 'User manual edit'
    });
  }

  if (title !== undefined) draft.title = title;
  if (hook !== undefined) draft.hook = hook;
  if (body !== undefined) draft.body = body;
  if (cta !== undefined) draft.cta = cta;
  if (hashtags !== undefined) draft.hashtags = hashtags;
  if (status !== undefined) {
    draft.status = status;
    if (status === 'published' && !draft.publishedAt) {
      draft.publishedAt = new Date();
    }
  }
  if (selectedApproach !== undefined) draft.selectedApproach = selectedApproach;
  if (scheduledFor !== undefined) draft.scheduledFor = scheduledFor;

  const fullText = `${draft.hook}\n\n${draft.body}\n\n${draft.cta || ''}`;
  draft.characterCount = fullText.length;
  draft.wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  await draft.save();

  return res.status(200).json(ApiResponse.success(draft, 'Draft updated successfully'));
});

/**
 * Delete a draft
 * DELETE /api/studio/drafts/:id
 */
export const deleteDraft = asyncHandler(async (req, res) => {
  const draft = await ContentDraft.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Draft not found');
  }

  return res.status(200).json(ApiResponse.success(null, 'Draft deleted successfully'));
});

export default {
  generatePosts,
  getDrafts,
  getDraftById,
  selectVariation,
  regenerateHooks,
  regeneratePost,
  changeAngle,
  humanizePost,
  approveDraft,
  revertVersion,
  updateDraft,
  deleteDraft
};
