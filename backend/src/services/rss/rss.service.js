import Parser from 'rss-parser';
import logger from '../../utils/logger.js';
import { normalizeUrl } from '../../utils/urlNormalizer.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'LinkedInContentStudio/1.0 (RSS News Aggregator)'
  }
});

// Curated fallback industry RSS feeds mapped by category
export const DEFAULT_CATEGORY_FEEDS = {
  'Artificial Intelligence': [
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/category/ai/feed/'
  ],
  'Software Development': [
    'https://dev.to/feed',
    'https://techcrunch.com/category/enterprise/feed/'
  ],
  Startups: [
    'https://techcrunch.com/category/startups/feed/',
    'https://news.ycombinator.com/rss'
  ],
  Business: [
    'https://techcrunch.com/feed/',
    'https://feeds.bloomberg.com/markets/news.rss'
  ],
  Technology: [
    'https://techcrunch.com/feed/',
    'https://www.theverge.com/rss/index.xml'
  ],
  Finance: [
    'https://feeds.bloomberg.com/markets/news.rss',
    'https://www.cnbc.com/id/10000664/device/rss/rss.html'
  ]
};

/**
 * Calculate cutoff date based on freshness window
 */
export const getCutoffDate = (freshness = '48h') => {
  const now = new Date();
  switch (freshness) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '48h':
      return new Date(now.getTime() - 48 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 48 * 60 * 60 * 1000);
  }
};

/**
 * Fetch and parse a single RSS feed URL
 */
export const fetchRssFeed = async (feedUrl, { keywords = [], freshness = '48h' } = {}) => {
  try {
    logger.info(`Fetching RSS feed: ${feedUrl}`);
    const feed = await parser.parseURL(feedUrl);
    const publisherName = feed.title || new URL(feedUrl).hostname.replace(/^www\./, '');
    const cutoffDate = getCutoffDate(freshness);

    const validArticles = [];

    for (const item of feed.items || []) {
      const pubDate = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : new Date();

      // Check freshness
      if (pubDate < cutoffDate) {
        continue;
      }

      const title = (item.title || '').trim();
      const rawUrl = item.link || item.guid || '';
      const summary = (item.contentSnippet || item.summary || item.content || title).trim().slice(0, 800);

      if (!title || !rawUrl) continue;

      // Calculate relevance based on keywords if keywords exist
      let relevanceScore = 75;
      let matchedKeywords = [];

      if (keywords.length > 0) {
        const textToSearch = `${title} ${summary}`.toLowerCase();
        matchedKeywords = keywords.filter((kw) => textToSearch.includes(kw.toLowerCase()));
        if (matchedKeywords.length > 0) {
          relevanceScore = Math.min(98, 70 + matchedKeywords.length * 10);
        } else {
          // If keywords were provided but none matched, lower relevance score
          relevanceScore = 55;
        }
      }

      // Extract entities from title/summary
      const entities = [];
      matchedKeywords.forEach((kw) => {
        entities.push({ name: kw, category: 'technology' });
      });

      validArticles.push({
        title,
        sourceUrl: rawUrl,
        normalizedUrl: normalizeUrl(rawUrl),
        publisher: publisherName,
        sourceName: publisherName,
        publishedAt: pubDate,
        summary: summary || title,
        facts: [title, `Reported by ${publisherName} on ${pubDate.toLocaleDateString()}`],
        keyTakeaways: [title],
        entities,
        citations: [
          {
            url: rawUrl,
            title,
            textSnippet: summary.slice(0, 200)
          }
        ],
        relevanceScore,
        discoveryMethod: 'rss_feed'
      });
    }

    logger.info(`RSS feed parsed successfully: ${validArticles.length} recent articles found from ${feedUrl}`);
    return validArticles;
  } catch (error) {
    logger.warn(`Failed to parse RSS feed ${feedUrl}: ${error.message}`);
    return [];
  }
};

/**
 * Fetch from multiple RSS feeds in parallel and deduplicate
 */
export const fetchMultipleRssFeeds = async (feedUrls = [], options = {}) => {
  if (!Array.isArray(feedUrls) || feedUrls.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    feedUrls.map((url) => fetchRssFeed(url, options))
  );

  const allArticles = [];
  const seenUrls = new Set();

  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      for (const article of res.value) {
        if (!seenUrls.has(article.normalizedUrl)) {
          seenUrls.add(article.normalizedUrl);
          allArticles.push(article);
        }
      }
    }
  }

  return allArticles;
};

export default {
  fetchRssFeed,
  fetchMultipleRssFeeds,
  getCutoffDate,
  DEFAULT_CATEGORY_FEEDS
};

