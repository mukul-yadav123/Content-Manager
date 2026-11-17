import mongoose from 'mongoose';
import { normalizeUrl } from '../utils/urlNormalizer.js';

const quoteSchema = new mongoose.Schema(
  {
    quote: { type: String, required: true },
    speaker: { type: String, default: 'Unknown' },
    role: { type: String, default: '' }
  },
  { _id: false }
);

const entitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['company', 'person', 'technology', 'product', 'organization', 'metric', 'other'],
      default: 'other'
    },
    role: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  { _id: false }
);

const citationSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, default: '' },
    textSnippet: { type: String, default: '' }
  },
  { _id: false }
);

// Source item schema for multi-source coverage of the same event
const sourceItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    normalizedUrl: { type: String, default: '' },
    publisher: { type: String, default: 'Unknown Publisher' },
    title: { type: String, default: '' },
    publishedAt: { type: Date, default: Date.now },
    isPrimary: { type: Boolean, default: false }
  },
  { _id: false }
);

// Score breakdown schema for the 4 ranking criteria
const scoreBreakdownSchema = new mongoose.Schema(
  {
    recency: { type: Number, min: 0, max: 100, default: 0 },
    topicRelevance: { type: Number, min: 0, max: 100, default: 0 },
    discussionPotential: { type: Number, min: 0, max: 100, default: 0 },
    sourceQuality: { type: Number, min: 0, max: 100, default: 0 },
    finalScore: { type: Number, min: 0, max: 100, default: 0 }
  },
  { _id: false }
);

// Dedicated deep research schema for fact-checked multi-source investigation
const deepResearchSchema = new mongoose.Schema(
  {
    mainEvent: { type: String, default: '' },
    summary: { type: String, default: '' },
    keyFacts: { type: [String], default: [] },
    importantNumbers: { type: [String], default: [] },
    entities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    confirmedClaims: { type: [String], default: [] },
    uncertainClaims: { type: [String], default: [] },
    industryImpact: { type: String, default: '' },
    possibleAngles: { type: [String], default: [] },
    sources: { type: [sourceItemSchema], default: [] },
    contradictions: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    },
    researchedAt: { type: Date, default: Date.now },
    userNotes: { type: String, default: '' }
  },
  { _id: false }
);

const newsArticleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: [true, 'Topic reference is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Article title / headline is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters']
    },
    summary: {
      type: String,
      required: [true, 'Article summary is required']
    },
    sourceUrl: {
      type: String,
      required: [true, 'Original source URL is required'],
      trim: true
    },
    normalizedUrl: {
      type: String,
      required: true,
      index: true
    },
    publisher: {
      type: String,
      default: 'Web Intelligence',
      trim: true,
      index: true
    },
    sourceName: {
      type: String,
      default: 'Web Intelligence',
      trim: true
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    discoveredAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    evaluatedAt: {
      type: Date,
      default: null,
      index: true
    },
    discoveryMethod: {
      type: String,
      enum: ['ai_web_search', 'rss_feed', 'manual'],
      default: 'ai_web_search',
      index: true
    },
    relevanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 80,
      index: true
    },
    scoreBreakdown: {
      type: scoreBreakdownSchema,
      default: () => ({
        recency: 80,
        topicRelevance: 80,
        discussionPotential: 75,
        sourceQuality: 80,
        finalScore: 80
      })
    },
    // Multi-source coverage tracking
    sources: {
      type: [sourceItemSchema],
      default: []
    },
    sourceCount: {
      type: Number,
      default: 1,
      min: 1
    },
    eventClusterId: {
      type: String,
      default: null,
      index: true
    },
    // LinkedIn Evaluation Details
    shortlistReason: {
      type: String,
      default: ''
    },
    linkedInAngle: {
      type: String,
      default: ''
    },
    discussionHooks: {
      type: [String],
      default: []
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    facts: {
      type: [String],
      default: []
    },
    keyTakeaways: {
      type: [String],
      default: []
    },
    entities: {
      type: [entitySchema],
      default: []
    },
    citations: {
      type: [citationSchema],
      default: []
    },
    quotes: {
      type: [quoteSchema],
      default: []
    },
    statistics: {
      type: [String],
      default: []
    },
    suggestedAngles: {
      type: [String],
      default: []
    },
    // Deep Research Results
    deepResearch: {
      type: deepResearchSchema,
      default: null
    },
    hasDeepResearch: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: ['discovered', 'evaluated', 'shortlisted', 'rejected', 'selected', 'used', 'drafted', 'archived'],
      default: 'discovered',
      index: true
    },
    isInteresting: {
      type: Boolean,
      default: false,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    isUsedInDraft: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Pre-validate & Pre-save hooks: Ensure normalized URL, publisher consistency, sources array, and research flag
newsArticleSchema.pre('validate', function (next) {
  if (this.sourceUrl && !this.normalizedUrl) {
    this.normalizedUrl = normalizeUrl(this.sourceUrl);
  }
  if (!this.publisher && this.sourceName) {
    this.publisher = this.sourceName;
  }
  if (!this.sourceName && this.publisher) {
    this.sourceName = this.publisher;
  }

  // Ensure initial primary source is always present in sources array
  if (this.sourceUrl && (!this.sources || this.sources.length === 0)) {
    this.sources = [
      {
        url: this.sourceUrl,
        normalizedUrl: this.normalizedUrl || normalizeUrl(this.sourceUrl),
        publisher: this.publisher || 'Web Intelligence',
        title: this.title || '',
        publishedAt: this.publishedAt || new Date(),
        isPrimary: true
      }
    ];
  }

  // Keep sourceCount synced
  if (Array.isArray(this.sources) && this.sources.length > 0) {
    this.sourceCount = this.sources.length;
  }

  // Keep hasDeepResearch in sync with deepResearch presence
  this.hasDeepResearch = Boolean(this.deepResearch && this.deepResearch.mainEvent);

  // Keep isInteresting synced with selected / shortlisted
  if (this.status === 'selected' || this.status === 'shortlisted') {
    this.isInteresting = true;
  } else if (this.status === 'rejected') {
    this.isInteresting = false;
  }

  next();
});

// Compound Indexes for fast, filtered, user-isolated queries & duplicate prevention
newsArticleSchema.index({ userId: 1, normalizedUrl: 1 }, { unique: true });
newsArticleSchema.index({ userId: 1, topicId: 1, publishedAt: -1 });
newsArticleSchema.index({ userId: 1, status: 1 });
newsArticleSchema.index({ userId: 1, publisher: 1 });
newsArticleSchema.index({ userId: 1, relevanceScore: -1 });
newsArticleSchema.index({ userId: 1, isInteresting: 1 });
newsArticleSchema.index({ userId: 1, hasDeepResearch: 1 });
newsArticleSchema.index({ userId: 1, eventClusterId: 1 });

export const NewsArticle = mongoose.model('NewsArticle', newsArticleSchema);
export default NewsArticle;
