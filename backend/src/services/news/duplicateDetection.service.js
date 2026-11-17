import { normalizeUrl } from '../../utils/urlNormalizer.js';
import { calculateSourceQualityScore } from './newsRanking.service.js';
import logger from '../../utils/logger.js';

// Comprehensive English Stopwords List
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'couldn',
  'did', 'didn', 'do', 'does', 'doesn', 'doing', 'don', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn', 'has', 'hasn', 'have', 'haven',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'just',
  'll', 'm', 'ma', 'me', 'mightn', 'more', 'most', 'mustn', 'my', 'myself',
  'needn', 'no', 'nor', 'not', 'now', 'o', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 're', 's',
  'same', 'shan', 'she', 'should', 'shouldn', 'so', 'some', 'such', 't', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
  'up', 've', 'very', 'was', 'wasn', 'we', 'were', 'weren', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would',
  'wouldn', 'y', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenize and normalize text into meaningful keyword stems
 */
export const extractMeaningfulTokens = (text = '') => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
};

/**
 * Generate N-grams (bigrams and trigrams) for phrase matching
 */
export const generateNgrams = (tokens = [], n = 2) => {
  if (tokens.length < n) return [];
  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
};

/**
 * Calculate Jaccard similarity between two sets (0.0 to 1.0)
 */
export const calculateJaccardSimilarity = (setA, setB) => {
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0.0;
  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize += 1;
    }
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize > 0 ? intersectionSize / unionSize : 0.0;
};

/**
 * Calculate multi-layer semantic text similarity between two stories
 * Evaluates headline tokens, bigram phrases, and summary tokens
 */
export const calculateStorySimilarity = (storyA, storyB) => {
  const tokensA = extractMeaningfulTokens(storyA.title || '');
  const tokensB = extractMeaningfulTokens(storyB.title || '');

  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const tokenSim = calculateJaccardSimilarity(setA, setB);

  const ngramsA = new Set(generateNgrams(tokensA, 2));
  const ngramsB = new Set(generateNgrams(tokensB, 2));
  const ngramSim = calculateJaccardSimilarity(ngramsA, ngramsB);

  // If summaries exist, also factor in summary tokens
  let summarySim = 0.0;
  if (storyA.summary && storyB.summary) {
    const sumA = new Set(extractMeaningfulTokens(storyA.summary));
    const sumB = new Set(extractMeaningfulTokens(storyB.summary));
    summarySim = calculateJaccardSimilarity(sumA, sumB);
  }

  // Weight headline tokens more heavily as headlines capture core story essence
  const totalSimilarity = (tokenSim * 0.55) + (ngramSim * 0.30) + (summarySim * 0.15);
  return Math.min(1.0, Math.max(0.0, totalSimilarity));
};

/**
 * Check if two stories share significant named entities / anchor subjects
 * (e.g., both mentioning "nvidia" + "blackwell", or "anthropic" + "claude")
 */
export const hasSignificantEntityOverlap = (storyA, storyB) => {
  const tokensA = new Set(extractMeaningfulTokens(`${storyA.title} ${storyA.summary || ''}`));
  const tokensB = new Set(extractMeaningfulTokens(`${storyB.title} ${storyB.summary || ''}`));

  let sharedCount = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) {
      sharedCount += 1;
    }
  }

  // If they share at least 3 significant topical tokens, they are closely linked
  return sharedCount >= 3;
};

/**
 * Check if two stories are covering the same underlying event
 * Criteria:
 * 1. Same normalized URL -> Exact duplicate (1.0)
 * 2. High title/ngram similarity (>= 0.60) -> Near-duplicate
 * 3. Moderate similarity (>= 0.30) OR shared significant key entities AND published within maxHourDifference -> Same underlying event
 */
export const isSameUnderlyingEvent = (storyA, storyB, maxHourDifference = 72) => {
  // 1. Exact normalized URL match
  if (storyA.normalizedUrl && storyB.normalizedUrl && storyA.normalizedUrl === storyB.normalizedUrl) {
    return { isMatch: true, matchType: 'exact_url', similarity: 1.0 };
  }

  // 2. Publication date delta check
  const dateA = new Date(storyA.publishedAt || Date.now()).getTime();
  const dateB = new Date(storyB.publishedAt || Date.now()).getTime();
  const hoursDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60);

  // If stories are too far apart in time, they are distinct cycles
  if (hoursDiff > maxHourDifference) {
    return { isMatch: false, matchType: 'time_mismatch', similarity: 0.0 };
  }

  // 3. Compute text similarity
  const similarity = calculateStorySimilarity(storyA, storyB);

  // Near duplicate check (syndicated / identical reporting)
  if (similarity >= 0.60) {
    return { isMatch: true, matchType: 'near_duplicate', similarity };
  }

  // Same event check (different publishers reporting on the same development within the time window)
  if (similarity >= 0.28 || hasSignificantEntityOverlap(storyA, storyB)) {
    return { isMatch: true, matchType: 'same_event', similarity };
  }

  return { isMatch: false, matchType: 'distinct', similarity };
};

/**
 * Merge an incoming article into an existing story as an additional source
 * Preserves original reporting, publisher info, and elevates reputable sources
 */
export const mergeStorySources = (existingStory, incomingArticle) => {
  const incomingNormUrl = incomingArticle.normalizedUrl || normalizeUrl(incomingArticle.sourceUrl);

  // Ensure existing sources array is initialized
  if (!Array.isArray(existingStory.sources) || existingStory.sources.length === 0) {
    existingStory.sources = [
      {
        url: existingStory.sourceUrl,
        normalizedUrl: existingStory.normalizedUrl,
        publisher: existingStory.publisher || existingStory.sourceName || 'Web Intelligence',
        title: existingStory.title,
        publishedAt: existingStory.publishedAt || new Date(),
        isPrimary: true
      }
    ];
  }

  // Check if incoming URL is already recorded in sources
  const alreadyPresent = existingStory.sources.some(
    (s) => s.normalizedUrl === incomingNormUrl || s.url === incomingArticle.sourceUrl
  );

  if (!alreadyPresent) {
    const incomingPublisher = incomingArticle.publisher || incomingArticle.sourceName || 'Web Intelligence';
    const incomingPubDate = incomingArticle.publishedAt ? new Date(incomingArticle.publishedAt) : new Date();

    // Check if incoming source has higher reputation than current primary source
    const currentPrimary = existingStory.sources.find((s) => s.isPrimary) || existingStory.sources[0];
    const incomingQuality = calculateSourceQualityScore(incomingPublisher, incomingArticle.sourceUrl, 1);
    const currentQuality = calculateSourceQualityScore(currentPrimary.publisher, currentPrimary.url, 1);

    const isHigherQuality = incomingQuality > currentQuality;

    if (isHigherQuality) {
      // Elevate new source as primary because it has higher journalistic reputation
      existingStory.sources.forEach((s) => { s.isPrimary = false; });
      existingStory.sources.push({
        url: incomingArticle.sourceUrl,
        normalizedUrl: incomingNormUrl,
        publisher: incomingPublisher,
        title: incomingArticle.title || '',
        publishedAt: incomingPubDate,
        isPrimary: true
      });
      existingStory.sourceUrl = incomingArticle.sourceUrl;
      existingStory.normalizedUrl = incomingNormUrl;
      existingStory.publisher = incomingPublisher;
      existingStory.sourceName = incomingPublisher;
    } else {
      existingStory.sources.push({
        url: incomingArticle.sourceUrl,
        normalizedUrl: incomingNormUrl,
        publisher: incomingPublisher,
        title: incomingArticle.title || '',
        publishedAt: incomingPubDate,
        isPrimary: false
      });
    }

    existingStory.sourceCount = existingStory.sources.length;

    // Merge any new facts, citations, or entities if present
    if (Array.isArray(incomingArticle.facts) && incomingArticle.facts.length > 0) {
      const existingFactsSet = new Set(existingStory.facts || []);
      incomingArticle.facts.forEach((f) => {
        if (!existingFactsSet.has(f)) {
          existingStory.facts.push(f);
        }
      });
    }

    logger.info(
      `Merged additional source (${incomingPublisher}) into story "${existingStory.title}". Total sources: ${existingStory.sourceCount}`
    );
  }

  return existingStory;
};

export default {
  extractMeaningfulTokens,
  generateNgrams,
  calculateJaccardSimilarity,
  calculateStorySimilarity,
  hasSignificantEntityOverlap,
  isSameUnderlyingEvent,
  mergeStorySources
};
