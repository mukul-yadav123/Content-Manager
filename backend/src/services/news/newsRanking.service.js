import logger from '../../utils/logger.js';

/**
 * Default scoring weights according to specifications:
 * 1. Recency: 30%
 * 2. Topic Relevance: 30%
 * 3. Discussion Potential: 20%
 * 4. Source Quality: 20%
 */
export const DEFAULT_SCORING_WEIGHTS = {
  recency: 0.30,
  topicRelevance: 0.30,
  discussionPotential: 0.20,
  sourceQuality: 0.20
};

/**
 * Tiered reputation map for known publishers and domains
 */
export const SOURCE_QUALITY_TIERS = {
  tier1: {
    score: 95,
    names: [
      'reuters', 'bloomberg', 'financial times', 'ft.com', 'wall street journal', 'wsj',
      'techcrunch', 'the verge', 'wired', 'mit technology review', 'nature', 'science',
      'ieee spectrum', 'github blog', 'openai', 'openai blog', 'google cloud blog',
      'aws news blog', 'microsoft blog', 'y combinator', 'hacker news', 'arxiv',
      'associated press', 'ap news', 'bbc', 'new york times'
    ]
  },
  tier2: {
    score: 85,
    names: [
      'venturebeat', 'ars technica', 'infoq', 'zdnet', 'the register', 'forbes',
      'cnbc', 'fast company', 'business insider', 'siliconangle', 'techmeme',
      'quartz', 'fortune', 'the information', 'protocol', 'thenextweb', 'engadget',
      'hackernoon', 'tech target', 'infoworld', 'computerworld'
    ]
  },
  tier3: {
    score: 70,
    names: [
      'medium', 'substack', 'dev.to', 'towards data science', 'hashnode',
      'pr newswire', 'business wire', 'globenewswire', 'reddit', 'rss feed'
    ]
  }
};

/**
 * High-engagement discussion keywords for LinkedIn professional audience
 */
const DISCUSSION_KEYWORDS = [
  // Architectural & Technical Debates
  'benchmark', 'architecture', 'vs', 'replaces', 'deprecated', 'performance',
  'latency', 'security vulnerability', 'zero-day', 'outage', 'open-source',
  'breakthrough', 'ai agents', 'gpu', 'datacenter', 'scaling law', 'reliability',

  // Strategic & Market Impact
  'acquisition', 'layoffs', 'funding', 'ipo', 'antitrust', 'regulation',
  'monopoly', 'revenue', 'billion', 'million', 'market share', 'ceo', 'cto',
  'strategy', 'pricing', 'enterprise', 'partnership',

  // Workplace & Career Impact
  'future of work', 'remote', 'productivity', 'engineering leadership',
  'career', 'developer experience', 'hiring', 'talent', 'salaries', 'burnout'
];

/**
 * Compute Recency Score (0 - 100) using a calibrated decay curve
 * Under 6h: 100 pts
 * 6h - 24h: 90 - 100 pts
 * 24h - 48h: 70 - 89 pts
 * 2d - 7d: 35 - 69 pts
 * 7d - 30d: 10 - 34 pts
 * > 30d: 0 - 9 pts
 */
export const calculateRecencyScore = (publishedAt) => {
  if (!publishedAt) return 60;

  const pubDate = new Date(publishedAt);
  const now = new Date();
  const diffMs = now.getTime() - pubDate.getTime();

  // If published in the future or within the last 15 mins, treat as fresh breaking news
  if (diffMs <= 1000 * 60 * 15) return 100;

  const hoursElapsed = diffMs / (1000 * 60 * 60);

  if (hoursElapsed <= 6) {
    return 100;
  }
  if (hoursElapsed <= 24) {
    // 100 down to 90
    return Math.round(100 - ((hoursElapsed - 6) / 18) * 10);
  }
  if (hoursElapsed <= 48) {
    // 89 down to 70
    return Math.round(89 - ((hoursElapsed - 24) / 24) * 19);
  }
  if (hoursElapsed <= 168) {
    // 2 days to 7 days: 69 down to 35
    return Math.round(69 - ((hoursElapsed - 48) / 120) * 34);
  }
  if (hoursElapsed <= 720) {
    // 7 days to 30 days: 34 down to 10
    return Math.round(34 - ((hoursElapsed - 168) / 552) * 24);
  }

  // Older than 30 days: heavy penalty
  return Math.max(0, Math.round(10 - ((hoursElapsed - 720) / 720) * 10));
};

/**
 * Compute Source Quality Score (0 - 100)
 * Evaluates publisher name and domain reputation, plus bonus for multi-source corroboration
 */
export const calculateSourceQualityScore = (publisher = '', sourceUrl = '', sourceCount = 1) => {
  const normPub = (publisher || '').toLowerCase().trim();
  const normUrl = (sourceUrl || '').toLowerCase().trim();

  let baseScore = 55; // Default unverified / generic source score

  // Check Tier 1
  const isTier1 = SOURCE_QUALITY_TIERS.tier1.names.some(
    (name) => normPub.includes(name) || normUrl.includes(name.replace(/\s+/g, ''))
  );
  if (isTier1) {
    baseScore = SOURCE_QUALITY_TIERS.tier1.score;
  } else {
    // Check Tier 2
    const isTier2 = SOURCE_QUALITY_TIERS.tier2.names.some(
      (name) => normPub.includes(name) || normUrl.includes(name.replace(/\s+/g, ''))
    );
    if (isTier2) {
      baseScore = SOURCE_QUALITY_TIERS.tier2.score;
    } else {
      // Check Tier 3
      const isTier3 = SOURCE_QUALITY_TIERS.tier3.names.some(
        (name) => normPub.includes(name) || normUrl.includes(name.replace(/\s+/g, ''))
      );
      if (isTier3) {
        baseScore = SOURCE_QUALITY_TIERS.tier3.score;
      }
    }
  }

  // Bonus for multiple sources covering the same event (+5 for 2 sources, +10 for 3+ sources)
  if (sourceCount >= 3) {
    baseScore = Math.min(100, baseScore + 10);
  } else if (sourceCount === 2) {
    baseScore = Math.min(100, baseScore + 5);
  }

  return Math.min(100, Math.max(0, baseScore));
};

/**
 * Compute Topic Relevance Score (0 - 100) via keyword & entity density
 */
export const calculateTopicRelevanceScore = ({
  title = '',
  summary = '',
  facts = [],
  entities = [],
  topicKeywords = [],
  topicName = '',
  topicCategory = '',
  aiRelevanceScore = null
}) => {
  if (typeof aiRelevanceScore === 'number' && aiRelevanceScore >= 0 && aiRelevanceScore <= 100) {
    return Math.round(aiRelevanceScore);
  }

  const textToScan = [
    title,
    summary,
    ...facts,
    ...entities.map((e) => (typeof e === 'string' ? e : e.name || ''))
  ].join(' ').toLowerCase();

  const keywordsToMatch = [
    ...topicKeywords.map((k) => k.toLowerCase().trim()),
    topicName.toLowerCase().trim(),
    topicCategory.toLowerCase().trim()
  ].filter(Boolean);

  if (keywordsToMatch.length === 0) {
    return 75; // Neutral baseline when no keywords configured
  }

  let titleMatches = 0;
  let bodyMatches = 0;

  const titleLower = title.toLowerCase();

  keywordsToMatch.forEach((kw) => {
    if (titleLower.includes(kw)) {
      titleMatches += 1;
    }
    if (textToScan.includes(kw)) {
      bodyMatches += 1;
    }
  });

  const matchRatio = bodyMatches / keywordsToMatch.length;
  let score = 50;

  if (titleMatches >= 1) {
    score += 30; // Strong signal if headline explicitly mentions topic keyword
  }
  score += Math.min(25, Math.round(matchRatio * 25));

  // Entity richness bonus
  if (entities.length >= 3) score += 5;
  if (facts.length >= 2) score += 5;

  return Math.min(100, Math.max(0, score));
};

/**
 * Compute Discussion Potential Score (0 - 100)
 * Evaluates whether the story contains controversy, architecture trade-offs, metrics, or career implications
 */
export const calculateDiscussionPotentialScore = ({
  title = '',
  summary = '',
  facts = [],
  statistics = [],
  quotes = [],
  aiDiscussionScore = null
}) => {
  if (typeof aiDiscussionScore === 'number' && aiDiscussionScore >= 0 && aiDiscussionScore <= 100) {
    return Math.round(aiDiscussionScore);
  }

  const combinedText = [title, summary, ...facts].join(' ').toLowerCase();

  let matches = 0;
  DISCUSSION_KEYWORDS.forEach((kw) => {
    if (combinedText.includes(kw)) {
      matches += 1;
    }
  });

  // Base score 50
  let score = 50;

  // Keyword impact bonus (up to 25 pts)
  score += Math.min(25, matches * 7);

  // Statistics bonus: hard numbers drive high LinkedIn engagement
  if (statistics.length > 0 || /\d+([.,]\d+)?\s*(%|\$|billion|million|x|fold)/i.test(combinedText)) {
    score += 12;
  }

  // Direct quotes bonus: leadership quotes spur executive reactions
  if (quotes.length > 0 || /"[^"]{10,}"/.test(combinedText)) {
    score += 8;
  }

  // Facts count bonus
  if (facts.length >= 3) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
};

/**
 * Comprehensive Evaluation & Ranking Engine
 * Calculates the final 0-100 score according to configurable criteria weights
 */
export const evaluateAndRankArticle = ({
  article,
  topic = null,
  weights = DEFAULT_SCORING_WEIGHTS,
  aiScores = null
}) => {
  const effectiveWeights = {
    ...DEFAULT_SCORING_WEIGHTS,
    ...(weights || {})
  };

  // 1. Recency Score (30%)
  const recencyScore = calculateRecencyScore(article.publishedAt);

  // 2. Source Quality Score (20%)
  const sourceCount = article.sourceCount || (article.sources?.length || 1);
  const sourceQualityScore = calculateSourceQualityScore(
    article.publisher || article.sourceName,
    article.sourceUrl,
    sourceCount
  );

  // 3. Topic Relevance Score (30%)
  const topicRelevanceScore = calculateTopicRelevanceScore({
    title: article.title,
    summary: article.summary,
    facts: article.facts || [],
    entities: article.entities || [],
    topicKeywords: topic?.keywords || [],
    topicName: topic?.name || '',
    topicCategory: topic?.category || '',
    aiRelevanceScore: aiScores?.topicRelevanceScore
  });

  // 4. Discussion Potential Score (20%)
  const discussionPotentialScore = calculateDiscussionPotentialScore({
    title: article.title,
    summary: article.summary,
    facts: article.facts || [],
    statistics: article.statistics || [],
    quotes: article.quotes || [],
    aiDiscussionScore: aiScores?.discussionPotentialScore
  });

  // Final Weighted Score (0 - 100)
  const finalScore = Math.round(
    effectiveWeights.recency * recencyScore +
    effectiveWeights.topicRelevance * topicRelevanceScore +
    effectiveWeights.discussionPotential * discussionPotentialScore +
    effectiveWeights.sourceQuality * sourceQualityScore
  );

  const scoreBreakdown = {
    recency: recencyScore,
    topicRelevance: topicRelevanceScore,
    discussionPotential: discussionPotentialScore,
    sourceQuality: sourceQualityScore,
    finalScore: Math.min(100, Math.max(0, finalScore))
  };

  // Determine Shortlist Recommendation
  // Stories with score >= 70 and not outdated (recency >= 35) are shortlisted
  const isShortlisted = scoreBreakdown.finalScore >= 70 && recencyScore >= 35;

  // Synthesize rationale
  const shortlistReason = aiScores?.shortlistReason || generateShortlistReason({
    scoreBreakdown,
    publisher: article.publisher || article.sourceName,
    sourceCount
  });

  const linkedInAngle = aiScores?.linkedInAngle || generateLinkedInAngle({
    title: article.title,
    summary: article.summary,
    scoreBreakdown
  });

  return {
    finalScore: scoreBreakdown.finalScore,
    scoreBreakdown,
    isShortlisted,
    shortlistReason,
    linkedInAngle,
    discussionHooks: aiScores?.keyDiscussionHooks || generateDefaultDiscussionHooks(article.title),
    evaluatedAt: new Date()
  };
};

/**
 * Generate human-readable shortlist reasoning if AI output is unavailable
 */
const generateShortlistReason = ({ scoreBreakdown, publisher, sourceCount }) => {
  const reasons = [];

  if (scoreBreakdown.recency >= 85) {
    reasons.push('Breaking/recent development published in the active news cycle');
  } else if (scoreBreakdown.recency >= 65) {
    reasons.push('Fresh development within the past 48 hours');
  }

  if (scoreBreakdown.sourceQuality >= 80) {
    reasons.push(`Verified original reporting from high-reputation publisher (${publisher})`);
  }

  if (sourceCount >= 2) {
    reasons.push(`Corroborated by ${sourceCount} distinct industry sources`);
  }

  if (scoreBreakdown.topicRelevance >= 80) {
    reasons.push('High semantic match with core monitored topic keywords');
  }

  if (scoreBreakdown.discussionPotential >= 75) {
    reasons.push('Contains high-engagement professional debate and career implications');
  }

  return reasons.length > 0
    ? reasons.join('. ') + '.'
    : 'Evaluated story meeting threshold criteria for content curation.';
};

/**
 * Generate LinkedIn professional discussion angle
 */
const generateLinkedInAngle = ({ title, summary, scoreBreakdown }) => {
  if (scoreBreakdown.discussionPotential >= 80) {
    return 'Examines strategic industry shifts and technical trade-offs that provoke thoughtful commentary from engineering leaders and practitioners.';
  }
  if (scoreBreakdown.recency >= 85) {
    return 'Fast-moving breaking update ideal for sharing initial reactions, key takeaways, and what teams should prepare for.';
  }
  return 'Provides concrete industry context, real-world data points, and strategic lessons relevant to tech professionals.';
};

/**
 * Generate default LinkedIn hook formulations
 */
const generateDefaultDiscussionHooks = (title) => {
  return [
    `How does this change the roadmap for engineering and product teams?`,
    `Is this a temporary trend or an architectural turning point?`,
    `What are the immediate trade-offs teams should consider before adopting this?`
  ];
};

export default {
  DEFAULT_SCORING_WEIGHTS,
  SOURCE_QUALITY_TIERS,
  calculateRecencyScore,
  calculateSourceQualityScore,
  calculateTopicRelevanceScore,
  calculateDiscussionPotentialScore,
  evaluateAndRankArticle
};

