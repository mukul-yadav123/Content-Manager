import mongoose from 'mongoose';

const formattingRulesSchema = new mongoose.Schema(
  {
    maxLineSentences: { type: Number, default: 2, min: 1, max: 5 },
    useBulletPoints: { type: Boolean, default: true },
    emojiDensity: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'low'
    },
    paragraphSpacing: {
      type: String,
      enum: ['compact', 'standard', 'airy'],
      default: 'airy'
    },
    callToActionStyle: {
      type: String,
      enum: ['question', 'provocative', 'resource-link', 'discussion-starter'],
      default: 'discussion-starter'
    }
  },
  { _id: false }
);

const writingProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    profileName: {
      type: String,
      required: [true, 'Profile name is required'],
      trim: true,
      maxlength: [80, 'Profile name cannot exceed 80 characters'],
      default: 'Default Voice'
    },
    tone: {
      type: String,
      default: 'Authoritative yet accessible, conversational, punchy',
      maxlength: [200, 'Tone description cannot exceed 200 characters']
    },
    targetAudience: {
      type: String,
      default: 'Founders, Tech Executives, and Industry Leaders'
    },
    forbiddenWords: {
      type: [String],
      default: [
        'game-changer',
        'delve',
        'tapestry',
        'thrilled to announce',
        'in today fast-paced world',
        'leverage',
        'synergy',
        'beacon',
        'pivotal',
        'testament'
      ]
    },
    favoriteHooks: {
      type: [String],
      default: []
    },
    samplePosts: {
      type: [String],
      default: []
    },
    formattingRules: {
      type: formattingRulesSchema,
      default: () => ({})
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
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

// Compound Unique Index: Prevent duplicate profile names per user
writingProfileSchema.index({ userId: 1, profileName: 1 }, { unique: true });
writingProfileSchema.index({ userId: 1, isDefault: 1 });

export const WritingProfile = mongoose.model('WritingProfile', writingProfileSchema);
export default WritingProfile;
