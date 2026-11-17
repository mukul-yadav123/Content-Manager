import { NewsArticle } from '../../models/NewsArticle.js';
import { Topic, TOPIC_CATEGORIES } from '../../models/Topic.js';
import { searchNewsWithAI } from '../ai/newsResearch.service.js';
import { fetchMultipleRssFeeds, DEFAULT_CATEGORY_FEEDS } from '../rss/rss.service.js';
import { isSameUnderlyingEvent, mergeStorySources } from './duplicateDetection.service.js';
import { evaluateAndRankArticle } from './newsRanking.service.js';
import logger from '../../utils/logger.js';
import ApiError from '../../utils/apiError.js';

/**
 * Coordinate automated and manual news discovery across AI web search and RSS feeds,
 * with near-duplicate detection, multi-source event clustering, and ranking.
 */
export const discoverNewsForTopic = async ({
  userId,
  topicId,
  mode = 'all', // 'all' | 'ai' | 'rss'
  customRssUrl = null
}) => {
  // 1. Fetch user topic
  const topic = await Topic.findOne({ _id: topicId, userId });
  if (!topic) {
    throw ApiError.notFound('Topic not found or access denied.');
  }

  logger.info(`Starting news discovery for topic: "${topic.name}" [mode: ${mode}]`);

  const discoveryPromises = [];

  // 2. Queue AI Web Search if requested
  if (mode === 'all' || mode === 'ai') {
    discoveryPromises.push(
      searchNewsWithAI({
        topicName: topic.name,
        category: topic.category,
        keywords: topic.keywords,
        freshness: topic.freshness,
        region: topic.region
      })
    );
  }

  // 3. Queue RSS Ingestion if requested
  if (mode === 'all' || mode === 'rss') {
    const feedsToFetch = [];
    if (customRssUrl) {
      feedsToFetch.push(customRssUrl);
    }
    if (Array.isArray(topic.rssFeeds) && topic.rssFeeds.length > 0) {
      feedsToFetch.push(...topic.rssFeeds);
    }
    // Also include default industry feeds for the category
    const defaultFeeds = DEFAULT_CATEGORY_FEEDS[topic.category] || [];
    feedsToFetch.push(...defaultFeeds);

    const uniqueFeeds = [...new Set(feedsToFetch)];

    discoveryPromises.push(
      fetchMultipleRssFeeds(uniqueFeeds, {
        keywords: topic.keywords,
        freshness: topic.freshness
      })
    );
  }

  // 4. Await both sources in parallel
  const settled = await Promise.allSettled(discoveryPromises);
  const discoveredArticles = [];

  settled.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      discoveredArticles.push(...res.value);
    }
  });

  logger.info(`Aggregated ${discoveredArticles.length} raw articles for "${topic.name}". Deduplicating with database...`);

  // 5. In-memory deduplication by normalizedUrl
  const uniqueCandidateMap = new Map();
  discoveredArticles.forEach((article) => {
    if (article.normalizedUrl && !uniqueCandidateMap.has(article.normalizedUrl)) {
      uniqueCandidateMap.set(article.normalizedUrl, article);
    }
  });

  const candidates = Array.from(uniqueCandidateMap.values());
  const candidateUrls = candidates.map((a) => a.normalizedUrl);

  // 6. Query MongoDB for existing articles of this user (bounded to past 14 days for event clustering + exact URL candidates)
  const recentCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const existingArticles = await NewsArticle.find({
    userId,
    isArchived: false,
    $or: [
      { publishedAt: { $gte: recentCutoff } },
      { normalizedUrl: { $in: candidateUrls } }
    ]
  }).limit(500);

  const existingUrlMap = new Map();
  existingArticles.forEach((doc) => {
    existingUrlMap.set(doc.normalizedUrl, doc);
    // Also index secondary sources URLs
    if (Array.isArray(doc.sources)) {
      doc.sources.forEach((s) => {
        if (s.normalizedUrl) existingUrlMap.set(s.normalizedUrl, doc);
      });
    }
  });

  const newArticlesToInsert = [];
  let sourcesMergedCount = 0;
  let duplicatesSkipped = 0;
  const now = new Date();

  for (const candidate of candidates) {
    // 6a. Exact URL duplicate check
    if (existingUrlMap.has(candidate.normalizedUrl)) {
      duplicatesSkipped += 1;
      continue;
    }

    // 6b. Check if candidate covers the same underlying event as an existing story within 72h
    let matchedExistingStory = null;
    for (const existing of existingArticles) {
      const eventCheck = isSameUnderlyingEvent(candidate, existing, 72);
      if (eventCheck.isMatch) {
        matchedExistingStory = existing;
        break;
      }
    }

    if (matchedExistingStory) {
      // Merge candidate into existing story as an additional source
      mergeStorySources(matchedExistingStory, candidate);

      // Re-evaluate and re-rank with updated source count and reputable publisher
      const evalResult = evaluateAndRankArticle({
        article: matchedExistingStory,
        topic
      });
      matchedExistingStory.relevanceScore = evalResult.finalScore;
      matchedExistingStory.scoreBreakdown = evalResult.scoreBreakdown;
      matchedExistingStory.shortlistReason = evalResult.shortlistReason;
      matchedExistingStory.linkedInAngle = evalResult.linkedInAngle;
      matchedExistingStory.discussionHooks = evalResult.discussionHooks;

      await matchedExistingStory.save();
      existingUrlMap.set(candidate.normalizedUrl, matchedExistingStory);
      sourcesMergedCount += 1;
    } else {
      // 6c. New distinct story: calculate initial 0-100 evaluation score
      const initialPublisher = candidate.publisher || candidate.sourceName || 'Web Intelligence';
      const initialSources = [
        {
          url: candidate.sourceUrl,
          normalizedUrl: candidate.normalizedUrl,
          publisher: initialPublisher,
          title: candidate.title,
          publishedAt: candidate.publishedAt || now,
          isPrimary: true
        }
      ];

      const initialEval = evaluateAndRankArticle({
        article: {
          ...candidate,
          publisher: initialPublisher,
          sources: initialSources,
          sourceCount: 1
        },
        topic
      });

      newArticlesToInsert.push({
        userId,
        topicId: topic._id,
        title: candidate.title,
        summary: candidate.summary,
        sourceUrl: candidate.sourceUrl,
        normalizedUrl: candidate.normalizedUrl,
        publisher: initialPublisher,
        sourceName: initialPublisher,
        publishedAt: candidate.publishedAt || now,
        discoveredAt: now,
        discoveryMethod: candidate.discoveryMethod || 'ai_web_search',
        relevanceScore: initialEval.finalScore,
        scoreBreakdown: initialEval.scoreBreakdown,
        sources: initialSources,
        sourceCount: 1,
        shortlistReason: initialEval.shortlistReason,
        linkedInAngle: initialEval.linkedInAngle,
        discussionHooks: initialEval.discussionHooks,
        facts: candidate.facts || [],
        keyTakeaways: candidate.keyTakeaways || [],
        entities: candidate.entities || [],
        citations: candidate.citations || [],
        quotes: candidate.quotes || [],
        statistics: candidate.statistics || [],
        suggestedAngles: candidate.suggestedAngles || [],
        status: initialEval.isShortlisted ? 'shortlisted' : 'discovered',
        isInteresting: initialEval.isShortlisted
      });
    }
  }

  // 7. Bulk insert brand-new articles
  let insertedArticles = [];
  if (newArticlesToInsert.length > 0) {
    insertedArticles = await NewsArticle.insertMany(newArticlesToInsert, { ordered: false });
    logger.info(`Successfully stored ${insertedArticles.length} new stories in MongoDB for topic "${topic.name}".`);
  }

  // 8. Update Topic's lastResearchedAt and article count
  topic.lastResearchedAt = now;
  topic.articlesCount = await NewsArticle.countDocuments({ userId, topicId: topic._id, isArchived: false });
  await topic.save();

  return {
    topic: {
      _id: topic._id,
      name: topic.name,
      category: topic.category
    },
    totalDiscovered: candidates.length,
    newlySavedCount: insertedArticles.length,
    sourcesMergedCount,
    duplicatesSkipped,
    articles: insertedArticles
  };
};

export default {
  discoverNewsForTopic
};
