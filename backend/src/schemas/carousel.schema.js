import { z } from 'zod';

const THEMES = [
  'modern_navy',
  'minimal_light',
  'executive_slate',
  'obsidian_purple',
  'emerald_growth',
  'sunset_ember'
];

export const generateCarouselSchema = z.object({
  draftId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Draft ID format')
    .optional(),
  articleId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Article ID format')
    .optional(),
  slideCount: z
    .number()
    .int()
    .min(5, 'Minimum 5 slides required')
    .max(7, 'Maximum 7 slides allowed')
    .default(6),
  theme: z.enum(THEMES).default('modern_navy'),
  aspectRatio: z.enum(['4:5', '1:1']).default('4:5'),
  customInstructions: z.string().max(1000).optional()
}).refine(
  (data) => data.draftId || data.articleId,
  { message: 'Either draftId or articleId must be provided to generate a carousel' }
);

export const updateSlideSchema = z.object({
  heading: z.string().min(2, 'Heading must be at least 2 characters').max(250),
  subheading: z.string().max(250).optional().default(''),
  bodyText: z.string().max(800).optional().default(''),
  bulletPoints: z.array(z.string().max(200)).optional().default([]),
  categoryBadge: z.string().max(50).optional().default('INSIGHT'),
  statCallout: z
    .object({
      value: z.string().max(50).optional().default(''),
      label: z.string().max(100).optional().default('')
    })
    .optional(),
  visualConcept: z.string().max(400).optional().default(''),
  iconName: z.string().max(50).optional().default('sparkles')
});

export const updateCarouselSchema = z.object({
  title: z.string().min(2).max(250).optional(),
  theme: z.enum(THEMES).optional(),
  aspectRatio: z.enum(['4:5', '1:1']).optional(),
  status: z.enum(['draft', 'ready', 'rendered', 'archived']).optional(),
  slides: z.array(z.any()).min(5).max(7).optional()
});

export const regenerateSlideSchema = z.object({
  instructions: z.string().max(600).optional().default('')
});

