import { NewsArticle } from '../models/NewsArticle.js';
import { Topic } from '../models/Topic.js';
import { discoverNewsForTopic } from '../services/news/newsDiscovery.service.js';
import { evaluateAndRankArticle, DEFAULT_SCORING_WEIGHTS } from '../services/news/newsRanking.service.js';
import { evaluateArticleWithAI } from '../services/ai/newsEvaluation.service.js';
import { conductDeepNewsResearch } from '../services/ai/deepResearch.service.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPaginationOptions, formatPaginatedResponse } from '../utils/pagination.js';
import { getCutoffDate } from '../services/rss/rss.service.js';
import logger from '../utils/logger.js';

/**
 * Trigger manual or scheduled news discovery for a topic
 * POST /api/news/discover
 */
export const discoverNews = asyncHandler(async (req, res) => {
  const { topicId, mode, customRssUrl } = req.body;

  const result = await discoverNewsForTopic({
    userId: req.user._id,
    topicId,
    mode,
    customRssUrl
  });

  return res.status(200).json(
    ApiResponse.success(
      result,
      `Discovery completed: ${result.newlySavedCount} new stories saved, ${result.sourcesMergedCount || 0} multi-sources merged (${result.duplicatesSkipped} duplicates skipped).`
    )
  );
});

/**
 * Get discovered news feed with filters, ranking metrics, and pagination
 * GET /api/news
 */
export const getNews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req.query, 12, 100);

  const filter = { userId: req.user._id };

  // Topic filter
  if (req.query.topicId && req.query.topicId !== 'all') {
    filter.topicId = req.query.topicId;
  }

  // Publisher filter
  if (req.query.publisher && req.query.publisher !== 'all') {
    filter.publisher = req.query.publisher;
  }

  // Status filter ('discovered', 'evaluated', 'shortlisted', 'rejected', 'selected', 'used', etc.)
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  } else {
    // By default, exclude archived and rejected stories unless specifically asked
    filter.isArchived = false;
    filter.status = { $ne: 'rejected' };
  }

  // Interesting filter
  if (req.query.isInteresting === 'true') {
    filter.isInteresting = true;
  } else if (req.query.isInteresting === 'false') {
    filter.isInteresting = false;
  }

  // Deep research filter
  if (req.query.hasDeepResearch === 'true') {
    filter.hasDeepResearch = true;
  }

  // Minimum score filter
  if (req.query.minScore) {
    const min = Number(req.query.minScore);
    if (!isNaN(min)) {
      filter.relevanceScore = { $gte: min };
    }
  }

  // Freshness date filter
  if (req.query.freshness && req.query.freshness !== 'all') {
    const cutoff = getCutoffDate(req.query.freshness);
    filter.publishedAt = { $gte: cutoff };
  }

  // Search filter
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { summary: searchRegex },
      { publisher: searchRegex },
      { shortlistReason: searchRegex }
    ];
  }

  // Sorting
  let sortCriteria = { publishedAt: -1 };
  if (req.query.sortBy === 'score' || req.query.sortBy === 'relevanceScore') {
    sortCriteria = { relevanceScore: req.query.sortOrder === 'asc' ? 1 : -1, publishedAt: -1 };
  } else if (req.query.sortBy === 'discoveredAt') {
    sortCriteria = { discoveredAt: req.query.sortOrder === 'asc' ? 1 : -1 };
  } else if (req.query.sortBy === 'title') {
    sortCriteria = { title: req.query.sortOrder === 'desc' ? -1 : 1 };
  } else {
    // Default: Sort by relevanceScore descending, then publishedAt descending
    sortCriteria = { relevanceScore: -1, publishedAt: -1 };
  }

  const [articles, total, distinctPublishers, statusCounts] = await Promise.all([
    NewsArticle.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .populate('topicId', 'name category priority'),
    NewsArticle.countDocuments(filter),
    NewsArticle.distinct('publisher', { userId: req.user._id, isArchived: false }),
    NewsArticle.aggregate([
      { $match: { userId: req.user._id, isArchived: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const statusMap = {
    discovered: 0,
    evaluated: 0,
    shortlisted: 0,
    rejected: 0,
    selected: 0,
    used: 0
  };
  statusCounts.forEach((s) => {
    if (s._id && statusMap.hasOwnProperty(s._id)) {
      statusMap[s._id] = s.count;
    }
  });

  const responseData = {
    ...formatPaginatedResponse({ items: articles, total, page, limit }),
    publishers: distinctPublishers.filter(Boolean),
    statusCounts: statusMap
  };

  return res.status(200).json(
    ApiResponse.success(responseData, 'News feed retrieved successfully')
  );
});

/**
 * Get single news article by ID with evaluation, multi-source details, and deep research
 * GET /api/news/:id
 */
export const getNewsById = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).populate('topicId', 'name category keywords region freshness');

  if (!article) {
    throw ApiError.notFound('News story not found or access denied.');
  }

  return res.status(200).json(ApiResponse.success(article, 'News story retrieved successfully'));
});

/**
 * Evaluate and rank a single news story
 * POST /api/news/:id/evaluate
 */
export const evaluateNews = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).populate('topicId');

  if (!article) {
    throw ApiError.notFound('News story not found or access denied.');
  }

  const weights = req.body.weights || DEFAULT_SCORING_WEIGHTS;

  // 1. Run AI semantic evaluation
  const aiScores = await evaluateArticleWithAI({
    title: article.title,
    summary: article.summary,
    publisher: article.publisher,
    facts: article.facts || [],
    topicName: article.topicId?.name || '',
    topicCategory: article.topicId?.category || '',
    topicKeywords: article.topicId?.keywords || []
  });

  // 2. Compute final calibrated 0-100 score across 4 criteria
  const evalResult = evaluateAndRankArticle({
    article,
    topic: article.topicId,
    weights,
    aiScores
  });

  // 3. Update story fields
  article.relevanceScore = evalResult.finalScore;
  article.scoreBreakdown = evalResult.scoreBreakdown;
  article.shortlistReason = evalResult.shortlistReason;
  article.linkedInAngle = evalResult.linkedInAngle;
  article.discussionHooks = evalResult.discussionHooks;
  article.evaluatedAt = new Date();

  // If currently 'discovered', transition to 'shortlisted' or 'evaluated'
  if (article.status === 'discovered') {
    article.status = evalResult.isShortlisted ? 'shortlisted' : 'evaluated';
    if (evalResult.isShortlisted) {
      article.isInteresting = true;
    }
  }

  await article.save();

  logger.info(`Article "${article.title.substring(0, 40)}..." evaluated. Score: ${article.relevanceScore}/100, Status: ${article.status}`);

  return res.status(200).json(
    ApiResponse.success(article, `Story evaluated successfully. Score: ${article.relevanceScore}/100 (${article.status}).`)
  );
});

/**
 * Batch evaluate stories for a topic
 * POST /api/news/evaluate-batch
 */
export const evaluateBatchNews = asyncHandler(async (req, res) => {
  const { topicId, articleIds, limit = 10 } = req.body;

  const query = {
    userId: req.user._id,
    isArchived: false
  };

  if (Array.isArray(articleIds) && articleIds.length > 0) {
    query._id = { $in: articleIds };
  } else if (topicId && topicId !== 'all') {
    query.topicId = topicId;
    query.status = 'discovered';
  } else {
    query.status = 'discovered';
  }

  const articles = await NewsArticle.find(query).limit(limit).populate('topicId');

  const evaluatedArticles = [];

  for (const article of articles) {
    const aiScores = await evaluateArticleWithAI({
      title: article.title,
      summary: article.summary,
      publisher: article.publisher,
      facts: article.facts || [],
      topicName: article.topicId?.name || '',
      topicCategory: article.topicId?.category || '',
      topicKeywords: article.topicId?.keywords || []
    });

    const evalResult = evaluateAndRankArticle({
      article,
      topic: article.topicId,
      aiScores
    });

    article.relevanceScore = evalResult.finalScore;
    article.scoreBreakdown = evalResult.scoreBreakdown;
    article.shortlistReason = evalResult.shortlistReason;
    article.linkedInAngle = evalResult.linkedInAngle;
    article.discussionHooks = evalResult.discussionHooks;
    article.evaluatedAt = new Date();

    if (article.status === 'discovered') {
      article.status = evalResult.isShortlisted ? 'shortlisted' : 'evaluated';
      if (evalResult.isShortlisted) {
        article.isInteresting = true;
      }
    }

    await article.save();
    evaluatedArticles.push(article);
  }

  return res.status(200).json(
    ApiResponse.success(
      { evaluatedCount: evaluatedArticles.length, articles: evaluatedArticles },
      `Batch evaluation completed for ${evaluatedArticles.length} stories.`
    )
  );
});

/**
 * Conduct Deep AI Investigative Research on a selected news story
 * POST /api/news/:id/research
 */
export const researchNewsStory = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).populate('topicId', 'name category keywords region freshness');

  if (!article) {
    throw ApiError.notFound('News story not found or access denied.');
  }

  if (article.status === 'rejected') {
    throw ApiError.badRequest('Cannot research a rejected story. Please approve or re-evaluate first.');
  }

  logger.info(`Starting deep news research for story "${article.title.substring(0, 40)}..."`);

  // Run deep investigative research with web_search
  const researchResult = await conductDeepNewsResearch({
    title: article.title,
    summary: article.summary,
    sourceUrl: article.sourceUrl,
    publisher: article.publisher,
    publishedAt: article.publishedAt,
    topicName: article.topicId?.name || '',
    topicCategory: article.topicId?.category || '',
    existingFacts: article.facts || [],
    knownSources: article.sources || []
  });

  // Attach research result to article
  article.deepResearch = researchResult;
  article.hasDeepResearch = true;

  // Sync facts, numbers, and angles with top-level fields for fast access
  if (Array.isArray(researchResult.keyFacts) && researchResult.keyFacts.length > 0) {
    article.facts = researchResult.keyFacts;
  }
  if (Array.isArray(researchResult.possibleAngles) && researchResult.possibleAngles.length > 0) {
    article.suggestedAngles = researchResult.possibleAngles;
  }
  if (Array.isArray(researchResult.importantNumbers) && researchResult.importantNumbers.length > 0) {
    article.statistics = researchResult.importantNumbers;
  }

  // Merge any newly verified independent sources
  if (Array.isArray(researchResult.sources) && researchResult.sources.length > 0) {
    const existingUrlSet = new Set((article.sources || []).map((s) => s.normalizedUrl || s.url));
    researchResult.sources.forEach((s) => {
      const norm = s.normalizedUrl || s.url;
      if (!existingUrlSet.has(norm)) {
        article.sources.push(s);
        existingUrlSet.add(norm);
      }
    });
    article.sourceCount = article.sources.length;
  }

  // Update status: elevate to selected for content generation
  if (['discovered', 'evaluated', 'shortlisted'].includes(article.status)) {
    article.status = 'selected';
    article.isInteresting = true;
  }

  await article.save();

  logger.info(
    `Deep research completed for "${article.title.substring(0, 40)}...". Found ${article.sourceCount} sources, ${researchResult.keyFacts.length} facts.`
  );

  return res.status(200).json(
    ApiResponse.success(
      {
        articleId: article._id,
        research: article.deepResearch,
        article
      },
      'Deep AI news research and fact-checking completed successfully.'
    )
  );
});

/**
 * Retrieve deep research results for an article
 * GET /api/news/:id/research
 */
export const getNewsResearch = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).select('title sourceUrl publisher publishedAt status deepResearch hasDeepResearch sources sourceCount');

  if (!article) {
    throw ApiError.notFound('News story not found or access denied.');
  }

  if (!article.hasDeepResearch || !article.deepResearch) {
    throw ApiError.notFound(
      'Deep research has not been conducted for this story yet. Use POST /api/news/:id/research to trigger.'
    );
  }

  return res.status(200).json(
    ApiResponse.success(
      {
        articleId: article._id,
        research: article.deepResearch,
        sources: article.sources,
        sourceCount: article.sourceCount
      },
      'Deep news research retrieved successfully.'
    )
  );
});

/**
 * Update / review deep research notes or fields before generating LinkedIn content
 * PATCH /api/news/:id/research
 */
export const updateNewsResearch = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!article) {
    throw ApiError.notFound('News story not found or access denied.');
  }

  if (!article.deepResearch) {
    throw ApiError.badRequest('No deep research exists to update. Run research first.');
  }

  const {
    userNotes,
    mainEvent,
    summary,
    keyFacts,
    importantNumbers,
    confirmedClaims,
    uncertainClaims,
    industryImpact,
    possibleAngles
  } = req.body;

  if (typeof userNotes === 'string') article.deepResearch.userNotes = userNotes;
  if (typeof mainEvent === 'string') article.deepResearch.mainEvent = mainEvent;
  if (typeof summary === 'string') article.deepResearch.summary = summary;
  if (typeof industryImpact === 'string') article.deepResearch.industryImpact = industryImpact;
  if (Array.isArray(keyFacts)) article.deepResearch.keyFacts = keyFacts;
  if (Array.isArray(importantNumbers)) article.deepResearch.importantNumbers = importantNumbers;
  if (Array.isArray(confirmedClaims)) article.deepResearch.confirmedClaims = confirmedClaims;
  if (Array.isArray(uncertainClaims)) article.deepResearch.uncertainClaims = uncertainClaims;
  if (Array.isArray(possibleAngles)) article.deepResearch.possibleAngles = possibleAngles;

  article.markModified('deepResearch');
  await article.save();

  return res.status(200).json(
    ApiResponse.success(
      {
        articleId: article._id,
        research: article.deepResearch
      },
      'Research notes and facts updated successfully.'
    )
  );
});

/**
 * User approves a story for LinkedIn content generation
 * PATCH /api/news/:id/approve
 */
export const approveNews = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!article) {
    throw ApiError.notFound('News story not found or access denied.');
  }

  article.status = 'selected';
  article.isInteresting = true;
  article.rejectionReason = '';

  await article.save();

  logger.info(`Story approved by user: "${article.title.substring(0, 40)}..."`);

  return res.status(200).json(
    ApiResponse.success(article, 'Story approved and selected for LinkedIn content generation.')
  );
});

/**
 * User rejects a story (excludes from post generation)
 * PATCH /api/news/:id/reject
 */
export const rejectNews = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!article) {
    throw ApiError.notFound('News story not found or access denied.');
  }

  article.status = 'rejected';
  article.isInteresting = false;
  if (req.body.reason) {
    article.rejectionReason = req.body.reason;
  }

  await article.save();

  logger.info(`Story rejected by user: "${article.title.substring(0, 40)}..." [Reason: ${article.rejectionReason || 'None'}]`);

  return res.status(200).json(
    ApiResponse.success(article, 'Story rejected. It will not be used for automatic post generation.')
  );
});

/**
 * Update news article (generic attributes)
 * PATCH /api/news/:id
 */
export const updateNews = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!article) {
    throw ApiError.notFound('News story not found.');
  }

  if (req.body.status) {
    // If setting to rejected, enforce rejected flags
    if (req.body.status === 'rejected') {
      article.status = 'rejected';
      article.isInteresting = false;
    } else {
      article.status = req.body.status;
      if (req.body.status === 'selected' || req.body.status === 'shortlisted') {
        article.isInteresting = true;
      }
    }
  }

  if (typeof req.body.isInteresting === 'boolean') {
    article.isInteresting = req.body.isInteresting;
    if (req.body.isInteresting && (article.status === 'discovered' || article.status === 'evaluated')) {
      article.status = 'selected';
    } else if (!req.body.isInteresting && article.status === 'selected') {
      article.status = 'discovered';
    }
  }

  if (typeof req.body.isArchived === 'boolean') {
    article.isArchived = req.body.isArchived;
  }

  if (req.body.rejectionReason) {
    article.rejectionReason = req.body.rejectionReason;
  }

  if (Array.isArray(req.body.suggestedAngles)) {
    article.suggestedAngles = req.body.suggestedAngles;
  }

  await article.save();

  return res.status(200).json(
    ApiResponse.success(article, 'News story updated successfully')
  );
});

/**
 * Delete a news story
 * DELETE /api/news/:id
 */
export const deleteNews = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!article) {
    throw ApiError.notFound('News story not found or already deleted.');
  }

  // Update topic article count safely with non-negative lower bound
  await Topic.findOneAndUpdate(
    { _id: article.topicId, articlesCount: { $gt: 0 } },
    { $inc: { articlesCount: -1 } }
  );

  return res.status(200).json(
    ApiResponse.success({ _id: req.params.id }, 'News story deleted successfully')
  );
});

export default {
  discoverNews,
  getNews,
  getNewsById,
  evaluateNews,
  evaluateBatchNews,
  researchNewsStory,
  getNewsResearch,
  updateNewsResearch,
  approveNews,
  rejectNews,
  updateNews,
  deleteNews
};
