import { z } from 'zod';
import { TOPIC_CATEGORIES } from '../models/Topic.js';

export const createTopicSchema = z.object({
  name: z
    .string({ required_error: 'Topic name is required' })
    .trim()
    .min(2, 'Topic name must be at least 2 characters')
    .max(100, 'Topic name cannot exceed 100 characters'),
  category: z.enum(TOPIC_CATEGORIES).default('Technology'),
  industry: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional().default(''),
  keywords: z.array(z.string().trim().min(1)).default([]),
  targetAudience: z.string().trim().max(200).optional().default('General industry professionals'),
  region: z
    .enum(['global', 'north_america', 'europe', 'asia_pacific', 'latin_america', 'middle_east_africa'])
    .default('global'),
  freshness: z.enum(['24h', '48h', '7d', '30d']).default('48h'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  isActive: z.boolean().default(true)
});

export const updateTopicSchema = createTopicSchema.partial();

export const topicQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export default {
  createTopicSchema,
  updateTopicSchema,
  topicQuerySchema
};

