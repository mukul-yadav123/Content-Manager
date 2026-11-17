import mongoose from 'mongoose';

const slideSchema = new mongoose.Schema(
  {
    slideNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 15
    },
    slideType: {
      type: String,
      enum: ['hook_intro', 'content_point', 'key_takeaway', 'closing_cta'],
      default: 'content_point'
    },
    categoryBadge: {
      type: String,
      default: 'INSIGHT',
      trim: true,
      maxlength: 50
    },
    heading: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },
    subheading: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200
    },
    bodyText: {
      type: String,
      default: '',
      trim: true,
      maxlength: 600
    },
    bulletPoints: {
      type: [String],
      default: []
    },
    statCallout: {
      value: { type: String, default: '' },
      label: { type: String, default: '' }
    },
    visualConcept: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300
    },
    iconName: {
      type: String,
      default: 'sparkles',
      trim: true
    },
    renderedImageUrl: {
      type: String,
      default: ''
    },
    renderedImagePublicId: {
      type: String,
      default: ''
    }
  },
  { _id: true, timestamps: false }
);

const carouselSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    contentDraftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContentDraft',
      index: true,
      default: null
    },
    newsArticleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsArticle',
      index: true,
      default: null
    },
    title: {
      type: String,
      required: [true, 'Carousel title is required'],
      trim: true,
      maxlength: 250
    },
    topic: {
      type: String,
      default: 'Technology & Business',
      trim: true,
      maxlength: 100
    },
    theme: {
      type: String,
      enum: [
        'modern_navy',
        'minimal_light',
        'executive_slate',
        'obsidian_purple',
        'emerald_growth',
        'sunset_ember'
      ],
      default: 'modern_navy'
    },
    slideCount: {
      type: Number,
      default: 6,
      min: [5, 'Carousels must have at least 5 slides'],
      max: [7, 'Carousels cannot exceed 7 slides in this mode']
    },
    aspectRatio: {
      type: String,
      enum: ['4:5', '1:1'],
      default: '4:5'
    },
    dimensions: {
      width: { type: Number, default: 1080 },
      height: { type: Number, default: 1350 }
    },
    author: {
      name: { type: String, default: 'Thought Leader' },
      headline: { type: String, default: 'Tech & Business Strategist' },
      handle: { type: String, default: '@thoughtleader' },
      avatarUrl: { type: String, default: '' }
    },
    slides: {
      type: [slideSchema],
      default: [],
      validate: {
        validator: function (v) {
          return !v || (v.length >= 5 && v.length <= 7);
        },
        message: 'A carousel must contain between 5 and 7 slides.'
      }
    },
    status: {
      type: String,
      enum: ['draft', 'ready', 'rendered', 'archived'],
      default: 'draft',
      index: true
    },
    isRendered: {
      type: Boolean,
      default: false,
      index: true
    },
    renderedAt: {
      type: Date,
      default: null
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

// Indexes
carouselSchema.index({ userId: 1, createdAt: -1 });
carouselSchema.index({ userId: 1, contentDraftId: 1 });
carouselSchema.index({ userId: 1, status: 1 });

export const Carousel = mongoose.model('Carousel', carouselSchema);
export default Carousel;

