import mongoose from 'mongoose';

const generationJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    jobType: {
      type: String,
      enum: [
        'news-research',
        'post-generation',
        'humanize',
        'image-generation',
        'carousel-generation'
      ],
      required: [true, 'Job type is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    queueJobId: {
      type: String,
      index: true
    },
    inputParams: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    error: {
      message: { type: String },
      code: { type: String },
      details: { type: mongoose.Schema.Types.Mixed }
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    targetDraftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContentDraft'
    },
    targetArticleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsArticle'
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    durationMs: {
      type: Number
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
generationJobSchema.index({ userId: 1, status: 1 });
generationJobSchema.index({ userId: 1, createdAt: -1 });

export const GenerationJob = mongoose.model('GenerationJob', generationJobSchema);
export default GenerationJob;

