import { z } from 'zod';

/**
 * Zod validation schema for humanizing a draft
 */
export const humanizeDraftSchema = z.object({
  mode: z
    .enum(['light', 'professional', 'conversational'], {
      invalid_type_error: 'Mode must be light, professional, or conversational'
    })
    .default('professional'),
  tone: z.string().max(200).optional(),
  contentAngle: z.string().max(350).optional(),
  writingProfileId: z.string().optional()
});

/**
 * Zod validation schema for reverting draft to an earlier version
 */
export const revertVersionSchema = z.object({
  versionType: z.enum(['initial', 'humanized', 'user_edited', 'final_approved']),
  versionId: z.string().optional()
});

/**
 * Output Validation Schema for AI Humanization Output
 */
export const humanizationOutputSchema = z.object({
  hook: z.string().min(10),
  body: z.string().min(50),
  cta: z.string().default(''),
  hashtags: z.array(z.string()).default([])
});

/**
 * Output Validation Schema for Quality Evaluation
 */
export const qualityEvaluationOutputSchema = z.object({
  naturalnessScore: z.number().min(0).max(100),
  profileConsistencyScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
  engagementPotentialScore: z.number().min(0).max(100),
  relevanceScore: z.number().min(0).max(100),
  factualConsistencyScore: z.number().min(0).max(100),
  genericFillerDetected: z.array(z.string()).default([]),
  overallQualityScore: z.number().min(0).max(100),
  feedbackNotes: z.string().default('')
});

export default {
  humanizeDraftSchema,
  revertVersionSchema,
  humanizationOutputSchema,
  qualityEvaluationOutputSchema
};

