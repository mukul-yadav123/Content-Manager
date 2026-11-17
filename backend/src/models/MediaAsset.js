import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema(
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
      index: true
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public_id is required'],
      unique: true,
      trim: true
    },
    secureUrl: {
      type: String,
      required: [true, 'Cloudinary secureUrl is required'],
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true
    },
    assetType: {
      type: String,
      enum: ['single-image', 'carousel-slide', 'header', 'infographic', 'other'],
      default: 'single-image',
      index: true
    },
    imageStyle: {
      type: String,
      enum: [
        'editorial',
        'tech_illustration',
        'business_illustration',
        'news_graphic',
        'data_visual',
        'minimalist_concept'
      ],
      default: 'editorial',
      index: true
    },
    generationModel: {
      type: String,
      default: 'dall-e-3'
    },
    revisedPrompt: {
      type: String,
      default: ''
    },
    concept: {
      type: String,
      default: ''
    },
    isPreferred: {
      type: Boolean,
      default: false,
      index: true
    },
    format: {
      type: String,
      default: 'webp'
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    bytes: {
      type: Number
    },
    promptUsed: {
      type: String,
      default: ''
    },
    aspectRatio: {
      type: String,
      enum: ['1:1', '16:9', '4:5', '9:16'],
      default: '1:1'
    },
    altText: {
      type: String,
      default: '',
      maxlength: [200, 'Alt text cannot exceed 200 characters']
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
mediaAssetSchema.index({ userId: 1, createdAt: -1 });
mediaAssetSchema.index({ userId: 1, assetType: 1 });

export const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
export default MediaAsset;

