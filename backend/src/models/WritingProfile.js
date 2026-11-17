import mongoose from 'mongoose';

const writingProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    profileName: {
      type: String,
      required: true,
      default: 'Default Voice'
    },
    tone: {
      type: String,
      default: 'Authoritative yet accessible, punchy, conversational'
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
        'synergy'
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
      maxLineSentences: { type: Number, default: 2 },
      useBulletPoints: { type: Boolean, default: true },
      emojiDensity: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'low' }
    },
    isDefault: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const WritingProfile = mongoose.model('WritingProfile', writingProfileSchema);
export default WritingProfile;

