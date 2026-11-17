import mongoose from 'mongoose';

const formattingRulesSchema = new mongoose.Schema(
  {
    maxLineSentences: { type: Number, default: 2, min: 1, max: 5 },
    useBulletPoints: { type: Boolean, default: true },
    bulletStyle: { type: String, default: '•' }, // '•' | '-' | 'numbers'
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
    useCapitalizedHeadings: { type: Boolean, default: false },
    callToActionStyle: {
      type: String,
      enum: ['question', 'provocative', 'resource-link', 'discussion-starter'],
      default: 'discussion-starter'
    }
  },
  { _id: false }
);

// Learned suggestion schema from comparing user edits
const learnedSuggestionSchema = new mongoose.Schema(
  {
    ruleType: {
      type: String,
      required: true,
      enum: [
        'tone_pacing',
        'hook_length',
        'emoji_density',
        'paragraph_length',
        'forbidden_words',
        'bullet_style',
        'call_to_action',
        'formatting_habit'
      ]
    },
    currentSetting: { type: String, default: '' },
    suggestedSetting: { type: String, required: true },
    rationale: { type: String, required: true },
    examples: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'dismissed'],
      default: 'pending'
    },
    detectedAt: { type: Date, default: Date.now },
    appliedAt: { type: Date }
  },
  { _id: true }
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
    preferredStyle: {
      type: String,
      enum: ['authoritative', 'conversational', 'analytical', 'contrarian', 'storyteller', 'custom'],
      default: 'authoritative'
    },
    customInstructions: {
      type: String,
      default: '',
      maxlength: [2000, 'Custom instructions cannot exceed 2000 characters']
    },

    // 12 Analyzed Personality Traits from OpenAI
    toneOfVoice: {
      type: String,
      default: 'Confident, direct, pragmatic, and respectful of the reader time.'
    },
    vocabularyComplexity: {
      level: {
        type: String,
        enum: ['simple', 'moderate', 'advanced'],
        default: 'moderate'
      },
      description: {
        type: String,
        default: 'Clean professional terminology without obscure jargon or academic complexity.'
      }
    },
    sentenceLength: {
      averageWords: { type: Number, default: 12 },
      style: {
        type: String,
        enum: ['short', 'medium', 'varied'],
        default: 'varied'
      }
    },
    paragraphLength: {
      averageSentences: { type: Number, default: 2 },
      style: {
        type: String,
        enum: ['single-line', 'short', 'medium', 'varied'],
        default: 'short'
      }
    },
    hookPatterns: {
      type: [String],
      default: [
        'Contrarian observation',
        'Data / verified metric drop',
        'Direct strategic challenge'
      ]
    },
    storytellingPreferences: {
      type: String,
      default: 'Observer perspective using industry case studies rather than fabricated personal anecdotes.'
    },
    useOfPersonalOpinions: {
      level: {
        type: String,
        enum: ['frequent', 'balanced', 'fact-anchored'],
        default: 'fact-anchored'
      },
      style: {
        type: String,
        default: 'Grounds viewpoints in verifiable evidence and objective tradeoffs.'
      }
    },
    emojiFrequency: {
      type: String,
      enum: ['none', 'minimal', 'moderate', 'expressive'],
      default: 'minimal'
    },
    hashtagUsage: {
      frequency: {
        type: String,
        enum: ['none', 'minimal', 'targeted'],
        default: 'targeted'
      },
      preferredCount: { type: Number, default: 3 },
      notes: { type: String, default: 'Specific industry tags at the end of the post.' }
    },
    formattingHabits: {
      bulletStyle: { type: String, default: '•' },
      paragraphSpacing: { type: String, default: 'airy' },
      useCapitalizedHeadings: { type: Boolean, default: false }
    },
    commonExpressions: {
      type: [String],
      default: [
        'The real tradeoff is',
        'Beyond the headlines',
        'Here is the breakdown'
      ]
    },
    phrasesToAvoid: {
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

    // Backwards-compatible aliases
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

    // Learning from User Edits: Non-silent recommendations
    learnedSuggestions: {
      type: [learnedSuggestionSchema],
      default: []
    },

    // Analysis Metadata
    analysisMetadata: {
      analyzedAt: { type: Date },
      sampleCount: { type: Number, default: 0 },
      confidenceScore: { type: Number, min: 0, max: 100, default: 85 }
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
