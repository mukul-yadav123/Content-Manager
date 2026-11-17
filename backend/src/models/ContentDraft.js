import mongoose from 'mongoose';

const carouselSlideSchema = new mongoose.Schema(
  {
    slideNumber: { type: Number, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    mediaAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MediaAsset'
    }
  },
  { _id: true }
);

const revisionSchema = new mongoose.Schema(
  {
    hook: { type: String, required: true },
    body: { type: String, required: true },
    cta: { type: String, default: '' },
    editedAt: { type: Date, default: Date.now },
    note: { type: String, default: 'Manual edit' }
  },
  { _id: true }
);

const contentDraftSchema = new mongoose.Schema(
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
      index: true
    },
    newsArticleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsArticle',
      index: true
    },
    writingProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WritingProfile'
    },
    title: {
      type: String,
      required: [true, 'Draft title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    hook: {
      type: String,
      required: [true, 'Hook is required'],
      trim: true,
      maxlength: [280, 'Hook should be concise (max 280 characters)']
    },
    body: {
      type: String,
      required: [true, 'Body text is required']
    },
    cta: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'CTA cannot exceed 200 characters']
    },
    hashtags: {
      type: [String],
      default: []
    },
    format: {
      type: String,
      enum: ['standard', 'story', 'breakdown', 'carousel'],
      default: 'standard',
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'reviewing', 'ready', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    carouselSlides: {
      type: [carouselSlideSchema],
      default: []
    },
    mediaAssets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MediaAsset'
      }
    ],
    revisionHistory: {
      type: [revisionSchema],
      default: []
    },
    characterCount: {
      type: Number,
      default: 0
    },
    wordCount: {
      type: Number,
      default: 0
    },
    scheduledFor: {
      type: Date
    },
    publishedAt: {
      type: Date
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

// Pre-save hook to calculate character count and word count automatically
contentDraftSchema.pre('save', function (next) {
  const fullText = `${this.hook || ''}\n\n${this.body || ''}\n\n${this.cta || ''}`.trim();
  this.characterCount = fullText.length;
  this.wordCount = fullText.split(/\s+/).filter(Boolean).length;
  next();
});

// Indexes for fast querying, filtering, and sorting
contentDraftSchema.index({ userId: 1, status: 1 });
contentDraftSchema.index({ userId: 1, createdAt: -1 });
contentDraftSchema.index({ userId: 1, topicId: 1 });
contentDraftSchema.index({ userId: 1, format: 1 });

export const ContentDraft = mongoose.model('ContentDraft', contentDraftSchema);
export default ContentDraft;

