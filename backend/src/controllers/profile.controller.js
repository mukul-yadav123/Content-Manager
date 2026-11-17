import WritingProfile from '../models/WritingProfile.js';
import writingProfileAnalysisService from '../services/ai/writingProfileAnalysis.service.js';
import editLearningService from '../services/ai/editLearning.service.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

/**
 * Get current user's default writing profile
 * GET /api/profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  let profile = await WritingProfile.findOne({
    userId: req.user._id,
    isDefault: true
  });

  if (!profile) {
    // If not found, retrieve first profile or auto-create default
    profile = await WritingProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = await WritingProfile.create({
        userId: req.user._id,
        profileName: 'Default Voice',
        tone: 'Authoritative yet accessible, conversational, punchy',
        isDefault: true
      });
    }
  }

  return res.status(200).json(ApiResponse.success(profile, 'Writing profile retrieved successfully'));
});

/**
 * Analyze writing samples and extract comprehensive personal profile
 * POST /api/profile/analyze
 */
export const analyzeSamples = asyncHandler(async (req, res) => {
  const { samples, customInstructions = '', preferredStyle = 'authoritative', profileName } = req.body;

  if (!Array.isArray(samples) || samples.length === 0) {
    throw ApiError.badRequest('Please provide at least 1 writing sample to analyze.');
  }

  logger.info(`Analyzing ${samples.length} writing samples for user ${req.user._id}`);

  // Call forensic AI analysis service
  const analyzedData = await writingProfileAnalysisService.analyzeWritingSamples({
    samples,
    customInstructions,
    preferredStyle
  });

  // Find or create user's default profile
  let profile = await WritingProfile.findOne({
    userId: req.user._id,
    isDefault: true
  });

  const updatePayload = {
    profileName: profileName || profile?.profileName || 'Default Voice',
    tone: analyzedData.toneOfVoice || 'Authoritative yet accessible',
    preferredStyle,
    customInstructions,
    samplePosts: samples,
    toneOfVoice: analyzedData.toneOfVoice,
    vocabularyComplexity: analyzedData.vocabularyComplexity,
    sentenceLength: analyzedData.sentenceLength,
    paragraphLength: analyzedData.paragraphLength,
    hookPatterns: analyzedData.hookPatterns,
    storytellingPreferences: analyzedData.storytellingPreferences,
    useOfPersonalOpinions: analyzedData.useOfPersonalOpinions,
    emojiFrequency: analyzedData.emojiFrequency,
    hashtagUsage: analyzedData.hashtagUsage,
    formattingHabits: analyzedData.formattingHabits,
    commonExpressions: analyzedData.commonExpressions,
    phrasesToAvoid: analyzedData.phrasesToAvoid,
    forbiddenWords: analyzedData.phrasesToAvoid,
    analysisMetadata: analyzedData.analysisMetadata,
    formattingRules: {
      bulletStyle: analyzedData.formattingHabits?.bulletStyle || '•',
      paragraphSpacing: analyzedData.formattingHabits?.paragraphSpacing || 'airy',
      emojiDensity: analyzedData.emojiFrequency === 'expressive' ? 'high' : analyzedData.emojiFrequency === 'moderate' ? 'medium' : analyzedData.emojiFrequency === 'none' ? 'none' : 'low'
    }
  };

  if (profile) {
    Object.assign(profile, updatePayload);
    await profile.save();
  } else {
    profile = await WritingProfile.create({
      userId: req.user._id,
      isDefault: true,
      ...updatePayload
    });
  }

  return res
    .status(200)
    .json(ApiResponse.success(profile, 'Writing profile analyzed and saved successfully'));
});

/**
 * Update writing profile manually
 * PUT /api/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  let profile = await WritingProfile.findOne({
    userId: req.user._id,
    isDefault: true
  });

  if (!profile) {
    profile = await WritingProfile.findOne({ userId: req.user._id });
  }

  if (!profile) {
    throw ApiError.notFound('Writing profile not found');
  }

  // Update provided fields
  const allowedFields = [
    'profileName',
    'tone',
    'targetAudience',
    'preferredStyle',
    'customInstructions',
    'toneOfVoice',
    'vocabularyComplexity',
    'sentenceLength',
    'paragraphLength',
    'hookPatterns',
    'storytellingPreferences',
    'useOfPersonalOpinions',
    'emojiFrequency',
    'hashtagUsage',
    'formattingHabits',
    'commonExpressions',
    'phrasesToAvoid',
    'forbiddenWords',
    'samplePosts'
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      profile[field] = req.body[field];
    }
  });

  // Sync forbiddenWords with phrasesToAvoid
  if (req.body.phrasesToAvoid) {
    profile.forbiddenWords = req.body.phrasesToAvoid;
  }

  await profile.save();

  return res.status(200).json(ApiResponse.success(profile, 'Writing profile updated successfully'));
});

/**
 * Add a single sample post
 * POST /api/profile/samples
 */
export const addSample = asyncHandler(async (req, res) => {
  const { sample } = req.body;

  let profile = await WritingProfile.findOne({
    userId: req.user._id,
    isDefault: true
  });

  if (!profile) {
    throw ApiError.notFound('Writing profile not found');
  }

  if (!Array.isArray(profile.samplePosts)) {
    profile.samplePosts = [];
  }

  profile.samplePosts.push(sample.trim());
  await profile.save();

  return res.status(200).json(ApiResponse.success(profile, 'Sample post added to profile'));
});

/**
 * Accept or dismiss a learned suggestion from repeated user edits
 * POST /api/profile/suggestions/:id
 */
export const handleSuggestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action = 'accept' } = req.body;

  const profile = await WritingProfile.findOne({
    userId: req.user._id,
    isDefault: true
  });

  if (!profile) {
    throw ApiError.notFound('Writing profile not found');
  }

  const result = await editLearningService.applySuggestion({
    profile,
    suggestionId: id,
    action
  });

  return res.status(200).json(
    ApiResponse.success(
      result.profile,
      action === 'accept'
        ? 'Suggestion accepted and applied to writing profile'
        : 'Suggestion dismissed'
    )
  );
});

/**
 * Reset profile to clean defaults
 * POST /api/profile/reset-default
 */
export const resetDefaultProfile = asyncHandler(async (req, res) => {
  let profile = await WritingProfile.findOne({
    userId: req.user._id,
    isDefault: true
  });

  if (!profile) {
    throw ApiError.notFound('Writing profile not found');
  }

  profile.tone = 'Authoritative yet accessible, conversational, punchy';
  profile.toneOfVoice = 'Confident, direct, pragmatic, and respectful of the reader time.';
  profile.preferredStyle = 'authoritative';
  profile.customInstructions = '';
  profile.vocabularyComplexity = {
    level: 'moderate',
    description: 'Clean professional terminology without obscure jargon or academic complexity.'
  };
  profile.sentenceLength = { averageWords: 12, style: 'varied' };
  profile.paragraphLength = { averageSentences: 2, style: 'short' };
  profile.emojiFrequency = 'minimal';
  profile.formattingHabits = { bulletStyle: '•', paragraphSpacing: 'airy', useCapitalizedHeadings: false };
  profile.phrasesToAvoid = [
    'game-changer',
    'delve',
    'tapestry',
    'thrilled to announce',
    'in today fast-paced world',
    'leverage',
    'synergy',
    'beacon'
  ];
  profile.forbiddenWords = profile.phrasesToAvoid;

  await profile.save();

  return res.status(200).json(ApiResponse.success(profile, 'Profile reset to default settings'));
});

export default {
  getProfile,
  analyzeSamples,
  updateProfile,
  addSample,
  handleSuggestion,
  resetDefaultProfile
};

