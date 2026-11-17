import { z } from 'zod';

export const IMAGE_STYLES = [
  'editorial',
  'tech_illustration',
  'business_illustration',
  'news_graphic',
  'data_visual',
  'minimalist_concept'
];

/**
 * Zod schema for generating an image
 */
export const generateImageSchema = z.object({
  draftId: z.string({ required_error: 'Draft ID is required' }).min(1, 'Draft ID cannot be empty'),
  style: z
    .enum(IMAGE_STYLES, {
      invalid_type_error: 'Invalid image style. Choose from editorial, tech_illustration, business_illustration, news_graphic, data_visual, or minimalist_concept'
    })
    .default('editorial'),
  customPrompt: z.string().max(1000).optional(),
  concept: z.string().max(600).optional(),
  aspectRatio: z.enum(['1:1', '16:9']).default('1:1')
});

/**
 * Zod schema for generating an image variation
 */
export const generateVariationSchema = z.object({
  style: z.enum(IMAGE_STYLES).optional(),
  customPrompt: z.string().max(1000).optional(),
  concept: z.string().max(600).optional(),
  aspectRatio: z.enum(['1:1', '16:9']).optional().default('1:1')
});

/**
 * Zod schema for generating/regenerating image prompt only
 */
export const generatePromptSchema = z.object({
  draftId: z.string({ required_error: 'Draft ID is required' }).min(1, 'Draft ID cannot be empty'),
  style: z.enum(IMAGE_STYLES).default('editorial'),
  concept: z.string().max(600).optional()
});

/**
 * Zod schema for selecting preferred image
 */
export const selectImageSchema = z.object({
  draftId: z.string().optional()
});

export default {
  IMAGE_STYLES,
  generateImageSchema,
  generateVariationSchema,
  generatePromptSchema,
  selectImageSchema
};

