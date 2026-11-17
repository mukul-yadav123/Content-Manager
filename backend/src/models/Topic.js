import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    industry: {
      type: String,
      required: true,
      trim: true
    },
    keywords: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastResearchedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

topicSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Topic = mongoose.model('Topic', topicSchema);
export default Topic;

