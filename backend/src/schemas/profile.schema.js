import { z } from 'zod';

/**
 * Zod validation schema for analyzing writing samples
 */
export const analyzeSamplesSchema = z.object({
  samples: z
    .array(z.string().min(10, 'Each writing sample must contain at least 10 characters'))
    .min(1, 'Please provide at least 1 writing sample (3-10 recommended for high accuracy)')
    .max(25, 'Maximum of 25 writing samples allowed per analysis run'),
  customInstructions: z.string().max(2000).optional().default(''),
  preferredStyle: z
    .enum(['authoritative', 'conversational', 'analytical', 'contrarian', 'storyteller', 'custom'])
    .optional()
    .default('authoritative'),
  profileName: z.string().max(80).optional()
});

/**
 * Zod validation schema for updating writing profile manually
 */
export const updateProfileSchema = z.object({
  profileName: z.string().min(1).max(80).optional(),
  tone: z.string().max(200).optional(),
  targetAudience: z.string().max(200).optional(),
  customInstructions: z.string().max(2000).optional(),
  preferredStyle: z
    .enum(['authoritative', 'conversational', 'analytical', 'contrarian', 'storyteller', 'custom'])
    .optional(),
  toneOfVoice: z.string().optional(),
  vocabularyComplexity: z
    .object({
      level: z.enum(['simple', 'moderate', 'advanced']).optional(),
      description: z.string().optional()
    })
    .optional(),
  sentenceLength: z
    .object({
      averageWords: z.number().min(3).max(50).optional(),
      style: z.enum(['short', 'medium', 'varied']).optional()
    })
    .optional(),
  paragraphLength: z
    .object({
      averageSentences: z.number().min(1).max(10).optional(),
      style: z.enum(['single-line', 'short', 'medium', 'varied']).optional()
    })
    .optional(),
  hookPatterns: z.array(z.string()).optional(),
  storytellingPreferences: z.string().optional(),
  useOfPersonalOpinions: z
    .object({
      level: z.enum(['frequent', 'balanced', 'fact-anchored']).optional(),
      style: z.string().optional()
    })
    .optional(),
  emojiFrequency: z.enum(['none', 'minimal', 'moderate', 'expressive']).optional(),
  hashtagUsage: z
    .object({
      frequency: z.enum(['none', 'minimal', 'targeted']).optional(),
      preferredCount: z.number().min(0).max(10).optional(),
      notes: z.string().optional()
    })
    .optional(),
  formattingHabits: z
    .object({
      bulletStyle: z.string().optional(),
      paragraphSpacing: z.string().optional(),
      useCapitalizedHeadings: z.boolean().optional()
    })
    .optional(),
  commonExpressions: z.array(z.string()).optional(),
  phrasesToAvoid: z.array(z.string()).optional(),
  forbiddenWords: z.array(z.string()).optional(),
  samplePosts: z.array(z.string()).optional()
});

/**
 * Zod validation schema for adding a sample post
 */
export const addSampleSchema = z.object({
  sample: z.string().min(20, 'Sample post must be at least 20 characters')
});

/**
 * Output Validation Schema for OpenAI Writing Profile Extraction
 */
export const analyzedProfileOutputSchema = z.object({
  toneOfVoice: z.string().min(5),
  vocabularyComplexity: z.object({
    level: z.enum(['simple', 'moderate', 'advanced']),
    description: z.string().default('')
  }),
  sentenceLength: z.object({
    averageWords: z.number().default(12),
    style: z.enum(['short', 'medium', 'varied'])
  }),
  paragraphLength: z.object({
    averageSentences: z.number().default(2),
    style: z.enum(['single-line', 'short', 'medium', 'varied'])
  }),
  hookPatterns: z.array(z.string()).min(1),
  storytellingPreferences: z.string().default(''),
  useOfPersonalOpinions: z.object({
    level: z.enum(['frequent', 'balanced', 'fact-anchored']),
    style: z.string().default('')
  }),
  emojiFrequency: z.enum(['none', 'minimal', 'moderate', 'expressive']),
  hashtagUsage: z.object({
    frequency: z.enum(['none', 'minimal', 'targeted']),
    preferredCount: z.number().default(3),
    notes: z.string().default('')
  }),
  formattingHabits: z.object({
    bulletStyle: z.string().default('•'),
    paragraphSpacing: z.string().default('airy'),
    useCapitalizedHeadings: z.boolean().default(false)
  }),
  commonExpressions: z.array(z.string()).default([]),
  phrasesToAvoid: z.array(z.string()).default([])
});

export default {
  analyzeSamplesSchema,
  updateProfileSchema,
  addSampleSchema,
  analyzedProfileOutputSchema
};

