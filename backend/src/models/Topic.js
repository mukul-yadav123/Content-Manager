import mongoose from 'mongoose';

export const TOPIC_CATEGORIES = [
  'Artificial Intelligence',
  'Software Development',
  'Startups',
  'Business',
  'Technology',
  'Finance',
  'Other'
];

export const TOPIC_REGIONS = [
  { value: 'global', label: 'Global' },
  { value: 'north_america', label: 'North America (US & Canada)' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia_pacific', label: 'Asia-Pacific' },
  { value: 'latin_america', label: 'Latin America' },
  { value: 'middle_east_africa', label: 'Middle East & Africa' }
];

export const FRESHNESS_PREFERENCES = [
  { value: '24h', label: 'Past 24 hours (Breaking)' },
  { value: '48h', label: 'Past 48 hours (Trending)' },
  { value: '7d', label: 'Past 7 days (Weekly Roundup)' },
  { value: '30d', label: 'Past 30 days (Deep Dives)' }
];

export const GENERATION_PRIORITIES = [
  { value: 'high', label: 'High Priority (Daily Generation)' },
  { value: 'medium', label: 'Medium Priority (Weekly Focus)' },
  { value: 'low', label: 'Low Priority (Backlog)' }
];

const topicSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Topic name is required'],
      trim: true,
      maxlength: [100, 'Topic name cannot exceed 100 characters']
    },
    industry: {
      type: String,
      default: 'Technology',
      trim: true,
      maxlength: [100, 'Industry cannot exceed 100 characters']
    },
    category: {
      type: String,
      enum: TOPIC_CATEGORIES,
      default: 'Technology',
      index: true
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    keywords: {
      type: [String],
      default: []
    },
    rssFeeds: {
      type: [String],
      default: []
    },
    targetAudience: {
      type: String,
      default: 'General industry professionals and thought leaders'
    },
    region: {
      type: String,
      enum: ['global', 'north_america', 'europe', 'asia_pacific', 'latin_america', 'middle_east_africa'],
      default: 'global'
    },
    freshness: {
      type: String,
      enum: ['24h', '48h', '7d', '30d'],
      default: '48h'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastResearchedAt: {
      type: Date
    },
    articlesCount: {
      type: Number,
      default: 0
    },
    draftsCount: {
      type: Number,
      default: 0
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

// Compound Unique Index: A user cannot duplicate topics by name
topicSchema.index({ userId: 1, name: 1 }, { unique: true });
topicSchema.index({ userId: 1, isActive: 1 });
topicSchema.index({ userId: 1, category: 1 });
topicSchema.index({ userId: 1, priority: 1 });
topicSchema.index({ userId: 1, createdAt: -1 });

export const Topic = mongoose.model('Topic', topicSchema);
export default Topic;
