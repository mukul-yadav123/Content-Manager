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

// Schema for individual generation approach variation
const postVariationSchema = new mongoose.Schema(
  {
    variationId: { type: String, required: true },
    approach: {
      type: String,
      enum: ['news_update', 'industry_analysis', 'professional_opinion'],
      required: true
    },
    approachLabel: { type: String, default: '' },
    headline: { type: String, default: '' },
    hookOptions: { type: [String], default: [] },
    selectedHook: { type: String, default: '' },
    content: { type: String, required: true },
    keyTakeaways: { type: [String], default: [] },
    closingQuestion: { type: String, default: '' },
    hashtags: { type: [String], default: [] },
    sourceAttribution: { type: String, default: '' },
    suggestedImageConcept: { type: String, default: '' }
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
      maxlength: [300, 'Title cannot exceed 300 characters']
    },
    // Primary active post fields (synchronized with selected variation)
    hook: {
      type: String,
      required: [true, 'Hook is required'],
      trim: true,
      maxlength: [500, 'Hook should be concise']
    },
    body: {
      type: String,
      required: [true, 'Body text is required']
    },
    cta: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'CTA cannot exceed 300 characters']
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
    // The 3 generated variations stored for side-by-side comparison
    variations: {
      type: [postVariationSchema],
      default: []
    },
    selectedApproach: {
      type: String,
      enum: ['news_update', 'industry_analysis', 'professional_opinion'],
      default: 'news_update'
    },
    // Input parameters used for generation
    targetAudience: {
      type: String,
      default: 'Industry professionals and decision makers'
    },
    contentAngle: {
      type: String,
      default: ''
    },
    preferredStyle: {
      type: String,
      default: 'authoritative'
    },
    // Separation between initial AI drafts and humanized versions
    isHumanized: {
      type: Boolean,
      default: false,
      index: true
    },
    initialDraft: {
      hook: { type: String, default: '' },
      body: { type: String, default: '' },
      cta: { type: String, default: '' },
      hashtags: { type: [String], default: [] }
    },
    humanizedDraft: {
      hook: { type: String, default: '' },
      body: { type: String, default: '' },
      cta: { type: String, default: '' },
      hashtags: { type: [String], default: [] },
      humanizedAt: { type: Date }
    },
    // Ancillary metadata
    keyTakeaways: {
      type: [String],
      default: []
    },
    closingQuestion: {
      type: String,
      default: ''
    },
    sourceAttribution: {
      type: String,
      default: ''
    },
    suggestedImageConcept: {
      type: String,
      default: ''
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

// Pre-save hook: auto-calculate character and word count, and initialize initialDraft
contentDraftSchema.pre('save', function (next) {
  const fullText = `${this.hook || ''}\n\n${this.body || ''}\n\n${this.cta || ''}`.trim();
  this.characterCount = fullText.length;
  this.wordCount = fullText.split(/\s+/).filter(Boolean).length;

  // Preserve initial draft separate from humanized versions
  if (!this.initialDraft || !this.initialDraft.body) {
    this.initialDraft = {
      hook: this.hook || '',
      body: this.body || '',
      cta: this.cta || '',
      hashtags: this.hashtags || []
    };
  }

  next();
});

// Indexes for fast querying, filtering, and sorting
contentDraftSchema.index({ userId: 1, status: 1 });
contentDraftSchema.index({ userId: 1, createdAt: -1 });
contentDraftSchema.index({ userId: 1, topicId: 1 });
contentDraftSchema.index({ userId: 1, newsArticleId: 1 });
contentDraftSchema.index({ userId: 1, format: 1 });
contentDraftSchema.index({ userId: 1, isHumanized: 1 });

export const ContentDraft = mongoose.model('ContentDraft', contentDraftSchema);
export default ContentDraft;
