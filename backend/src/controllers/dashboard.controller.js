import { NewsArticle } from '../models/NewsArticle.js';
import { ContentDraft } from '../models/ContentDraft.js';
import { Topic } from '../models/Topic.js';
import { GenerationJob } from '../models/GenerationJob.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Get Comprehensive Dashboard Overview Statistics & Recent Activity
 * GET /api/dashboard/overview
 */
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Execute aggregated count queries in parallel
  const [
    totalNews,
    interestingStories,
    shortlistedStories,
    totalDrafts,
    readyPosts,
    publishedPosts,
    totalTopics,
    activeTopics,
    recentDrafts,
    recentNews,
    recentJobs
  ] = await Promise.all([
    NewsArticle.countDocuments({ userId, isArchived: false }),
    NewsArticle.countDocuments({ userId, isInteresting: true, isArchived: false }),
    NewsArticle.countDocuments({ userId, status: 'shortlisted', isArchived: false }),
    ContentDraft.countDocuments({ userId }),
    ContentDraft.countDocuments({ userId, status: 'ready' }),
    ContentDraft.countDocuments({ userId, status: 'published' }),
    Topic.countDocuments({ userId }),
    Topic.countDocuments({ userId, isActive: true }),
    // Recent 5 content drafts
    ContentDraft.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('topicId', 'name category')
      .select('title hook format status characterCount wordCount createdAt scheduledFor publishedAt'),
    // Recent 5 news stories with ranking & source metrics
    NewsArticle.find({ userId, isArchived: false })
      .sort({ publishedAt: -1 })
      .limit(5)
      .populate('topicId', 'name category')
      .select('title summary sourceName publisher sourceUrl relevanceScore scoreBreakdown shortlistReason linkedInAngle sourceCount status isInteresting publishedAt'),
    // Recent 5 generation jobs
    GenerationJob.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('jobType status progress startedAt completedAt durationMs error')
  ]);

  // Aggregate generation activity for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activityStats = await GenerationJob.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const overviewData = {
    metrics: {
      totalNews,
      interestingStories,
      shortlistedStories,
      totalDrafts,
      readyPosts,
      publishedPosts,
      totalTopics,
      activeTopics
    },
    recentDrafts,
    recentNews,
    recentJobs,
    generationActivity: activityStats
  };

  return res.status(200).json(
    ApiResponse.success(overviewData, 'Dashboard statistics fetched successfully')
  );
});

/**
 * Manually update content draft status (e.g., mark as 'ready', 'published', 'archived')
 * PATCH /api/dashboard/posts/:id/status
 */
export const updateDraftStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'reviewing', 'ready', 'published', 'archived'];

  if (!status || !validStatuses.includes(status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const draft = await ContentDraft.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!draft) {
    throw ApiError.notFound('Content draft not found or access denied.');
  }

  draft.status = status;
  if (status === 'published' && !draft.publishedAt) {
    draft.publishedAt = new Date();
  }

  await draft.save();

  return res.status(200).json(
    ApiResponse.success(draft, `Post draft status updated to "${status}".`)
  );
});

/**
 * Quick toggle interesting/favorite on a news article
 * PATCH /api/dashboard/news/:id/toggle-interesting
 */
export const toggleArticleInteresting = asyncHandler(async (req, res) => {
  const article = await NewsArticle.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!article) {
    throw ApiError.notFound('News story not found or access denied.');
  }

  article.isInteresting = !article.isInteresting;
  if (article.isInteresting && (article.status === 'discovered' || article.status === 'evaluated')) {
    article.status = 'selected';
  } else if (!article.isInteresting && article.status === 'selected') {
    article.status = 'discovered';
  }

  await article.save();

  return res.status(200).json(
    ApiResponse.success(
      article,
      article.isInteresting ? 'Story marked as interesting.' : 'Story removed from interesting.'
    )
  );
});

export const toggleInterestingNews = toggleArticleInteresting;

export default {
  getDashboardOverview,
  updateDraftStatus,
  toggleArticleInteresting,
  toggleInterestingNews
};
