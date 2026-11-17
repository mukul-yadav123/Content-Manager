import { z } from 'zod';

/**
 * Zod validation schema for generating LinkedIn posts
 */
export const generatePostsSchema = z.object({
  articleId: z.string({ required_error: 'Article ID is required' }).min(1, 'Article ID cannot be empty'),
  targetAudience: z.string().max(250).optional().default('Industry professionals and decision makers'),
  contentAngle: z.string().max(350).optional().default(''),
  preferredStyle: z
    .enum(['authoritative', 'conversational', 'analytical', 'contrarian', 'storytelling'])
    .optional()
    .default('authoritative'),
  postFormat: z.enum(['standard', 'story', 'breakdown', 'carousel']).optional().default('standard')
});

/**
 * Zod schema for selecting a specific approach variation and hook
 */
export const selectVariationSchema = z.object({
  approach: z.enum(['news_update', 'industry_analysis', 'professional_opinion'], {
    required_error: 'Approach is required'
  }),
  selectedHook: z.string().optional()
});

/**
 * Zod schema for regenerating hook options
 */
export const regenerateHooksSchema = z.object({
  approach: z.enum(['news_update', 'industry_analysis', 'professional_opinion']).optional(),
  contentAngle: z.string().max(350).optional(),
  targetAudience: z.string().max(250).optional()
});

/**
 * Zod schema for regenerating a post approach
 */
export const regeneratePostSchema = z.object({
  approach: z.enum(['news_update', 'industry_analysis', 'professional_opinion']).optional(),
  contentAngle: z.string().max(350).optional(),
  targetAudience: z.string().max(250).optional(),
  preferredStyle: z
    .enum(['authoritative', 'conversational', 'analytical', 'contrarian', 'storytelling'])
    .optional()
});

/**
 * Zod schema for changing content angle
 */
export const changeAngleSchema = z.object({
  contentAngle: z
    .string({ required_error: 'Content angle is required' })
    .min(3, 'Content angle must be at least 3 characters')
    .max(350, 'Content angle cannot exceed 350 characters')
});

/**
 * Zod schema for updating a draft manually
 */
export const updateDraftSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  hook: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  cta: z.string().max(300).optional(),
  hashtags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'reviewing', 'ready', 'published', 'archived']).optional(),
  selectedApproach: z.enum(['news_update', 'industry_analysis', 'professional_opinion']).optional(),
  scheduledFor: z.string().datetime().optional().nullable()
});

/**
 * Zod schema for querying studio drafts
 */
export const draftsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['all', 'draft', 'reviewing', 'ready', 'published', 'archived']).optional(),
  topicId: z.string().optional(),
  newsArticleId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

/**
 * Output Validation Schemas for AI Responses
 */
export const singleVariationOutputSchema = z.object({
  approach: z.enum(['news_update', 'industry_analysis', 'professional_opinion']),
  approachLabel: z.string().default(''),
  headline: z.string().default(''),
  hookOptions: z.array(z.string()).min(1),
  content: z.string().min(20),
  keyTakeaways: z.array(z.string()).default([]),
  closingQuestion: z.string().default(''),
  hashtags: z.array(z.string()).default([]),
  sourceAttribution: z.string().default(''),
  suggestedImageConcept: z.string().default('')
});

export const threeApproachesOutputSchema = z.object({
  newsUpdate: singleVariationOutputSchema,
  industryAnalysis: singleVariationOutputSchema,
  professionalOpinion: singleVariationOutputSchema
});

export const regeneratedHooksOutputSchema = z.object({
  approach: z.enum(['news_update', 'industry_analysis', 'professional_opinion']),
  hookOptions: z.array(z.string()).min(3)
});

export default {
  generatePostsSchema,
  selectVariationSchema,
  regenerateHooksSchema,
  regeneratePostSchema,
  changeAngleSchema,
  updateDraftSchema,
  draftsQuerySchema,
  singleVariationOutputSchema,
  threeApproachesOutputSchema,
  regeneratedHooksOutputSchema
};

