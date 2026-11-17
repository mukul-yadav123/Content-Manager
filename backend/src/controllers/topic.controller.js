import { Topic, TOPIC_CATEGORIES, TOPIC_REGIONS, FRESHNESS_PREFERENCES, GENERATION_PRIORITIES } from '../models/Topic.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPaginationOptions, formatPaginatedResponse } from '../utils/pagination.js';

/**
 * Get all topics for the authenticated user
 * GET /api/topics
 */
export const getTopics = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPaginationOptions(req.query, 12, 100);

  const filter = { userId: req.user._id };

  // Search filter
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { keywords: searchRegex },
      { description: searchRegex }
    ];
  }

  // Category filter
  if (req.query.category && req.query.category !== 'all') {
    filter.category = req.query.category;
  }

  // Priority filter
  if (req.query.priority && req.query.priority !== 'all') {
    filter.priority = req.query.priority;
  }

  // Active status filter
  if (req.query.isActive === 'true') {
    filter.isActive = true;
  } else if (req.query.isActive === 'false') {
    filter.isActive = false;
  }

  const [topics, total] = await Promise.all([
    Topic.find(filter).sort(sort).skip(skip).limit(limit),
    Topic.countDocuments(filter)
  ]);

  return res.status(200).json(
    ApiResponse.success(
      formatPaginatedResponse({ items: topics, total, page, limit }),
      'Topics retrieved successfully'
    )
  );
});

/**
 * Get topic categories and metadata
 * GET /api/topics/categories
 */
export const getTopicMetadata = asyncHandler(async (req, res) => {
  // Aggregate topic counts per category for the user
  const counts = await Topic.aggregate([
    { $match: { userId: req.user._id } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const countMap = counts.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const categories = TOPIC_CATEGORIES.map((cat) => ({
    name: cat,
    count: countMap[cat] || 0
  }));

  return res.status(200).json(
    ApiResponse.success(
      {
        categories,
        regions: TOPIC_REGIONS,
        freshnessOptions: FRESHNESS_PREFERENCES,
        priorities: GENERATION_PRIORITIES
      },
      'Topic metadata retrieved successfully'
    )
  );
});

/**
 * Get single topic by ID
 * GET /api/topics/:id
 */
export const getTopicById = asyncHandler(async (req, res) => {
  const topic = await Topic.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!topic) {
    throw ApiError.notFound('Topic not found or you do not have permission to access it.');
  }

  return res.status(200).json(ApiResponse.success(topic, 'Topic retrieved successfully'));
});

/**
 * Create a new topic
 * POST /api/topics
 */
export const createTopic = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    industry,
    description,
    keywords,
    targetAudience,
    region,
    freshness,
    priority,
    isActive
  } = req.body;

  // Check for duplicate topic name for this user
  const existingTopic = await Topic.findOne({
    userId: req.user._id,
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
  });

  if (existingTopic) {
    throw ApiError.badRequest(`A topic named "${name}" already exists in your workspace.`);
  }

  const topic = await Topic.create({
    userId: req.user._id,
    name: name.trim(),
    category: category || 'Technology',
    industry: industry || category || 'Technology',
    description: description || '',
    keywords: Array.isArray(keywords) ? keywords.map((k) => k.trim()).filter(Boolean) : [],
    targetAudience: targetAudience || 'General industry professionals',
    region: region || 'global',
    freshness: freshness || '48h',
    priority: priority || 'medium',
    isActive: typeof isActive === 'boolean' ? isActive : true
  });

  return res.status(201).json(ApiResponse.created(topic, 'Topic created successfully'));
});

/**
 * Update an existing topic
 * PUT /api/topics/:id
 */
export const updateTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!topic) {
    throw ApiError.notFound('Topic not found or you do not have permission to edit it.');
  }

  // If changing name, check for uniqueness conflict
  if (req.body.name && req.body.name.trim().toLowerCase() !== topic.name.toLowerCase()) {
    const duplicate = await Topic.findOne({
      userId: req.user._id,
      _id: { $ne: topic._id },
      name: { $regex: new RegExp(`^${req.body.name.trim()}$`, 'i') }
    });

    if (duplicate) {
      throw ApiError.badRequest(`Another topic named "${req.body.name}" already exists.`);
    }
    topic.name = req.body.name.trim();
  }

  // Update fields if provided
  if (req.body.category) topic.category = req.body.category;
  if (req.body.industry) topic.industry = req.body.industry;
  if (typeof req.body.description === 'string') topic.description = req.body.description;
  if (Array.isArray(req.body.keywords)) {
    topic.keywords = req.body.keywords.map((k) => k.trim()).filter(Boolean);
  }
  if (req.body.targetAudience) topic.targetAudience = req.body.targetAudience;
  if (req.body.region) topic.region = req.body.region;
  if (req.body.freshness) topic.freshness = req.body.freshness;
  if (req.body.priority) topic.priority = req.body.priority;
  if (typeof req.body.isActive === 'boolean') topic.isActive = req.body.isActive;

  await topic.save();

  return res.status(200).json(ApiResponse.success(topic, 'Topic updated successfully'));
});

/**
 * Toggle active status of a topic
 * PATCH /api/topics/:id/toggle
 */
export const toggleTopicStatus = asyncHandler(async (req, res) => {
  const topic = await Topic.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!topic) {
    throw ApiError.notFound('Topic not found.');
  }

  topic.isActive = !topic.isActive;
  await topic.save();

  return res.status(200).json(
    ApiResponse.success(
      { _id: topic._id, isActive: topic.isActive },
      `Topic ${topic.isActive ? 'activated' : 'deactivated'} successfully`
    )
  );
});

/**
 * Delete a topic
 * DELETE /api/topics/:id
 */
export const deleteTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!topic) {
    throw ApiError.notFound('Topic not found or already deleted.');
  }

  return res.status(200).json(
    ApiResponse.success({ _id: req.params.id }, 'Topic deleted successfully')
  );
});

export default {
  getTopics,
  getTopicMetadata,
  getTopicById,
  createTopic,
  updateTopic,
  toggleTopicStatus,
  deleteTopic
};

