import { z } from 'zod';

export const discoverNewsSchema = z.object({
  topicId: z.string({ required_error: 'Topic ID is required' }).min(1),
  mode: z.enum(['all', 'ai', 'rss']).default('all'),
  customRssUrl: z.string().url('Must be a valid RSS feed URL').optional().or(z.literal(''))
});

export const newsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  topicId: z.string().optional(),
  search: z.string().optional(),
  publisher: z.string().optional(),
  status: z.enum([
    'all',
    'discovered',
    'evaluated',
    'shortlisted',
    'rejected',
    'selected',
    'used',
    'drafted',
    'archived'
  ]).optional(),
  isInteresting: z.enum(['true', 'false', 'all']).optional(),
  freshness: z.enum(['24h', '48h', '7d', '30d', 'all']).optional(),
  minScore: z.string().optional(),
  sortBy: z.enum(['score', 'publishedAt', 'discoveredAt', 'title', 'relevanceScore']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const updateNewsSchema = z.object({
  status: z.enum([
    'discovered',
    'evaluated',
    'shortlisted',
    'rejected',
    'selected',
    'used',
    'drafted',
    'archived'
  ]).optional(),
  isInteresting: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  rejectionReason: z.string().optional(),
  suggestedAngles: z.array(z.string()).optional()
});

export const evaluateNewsSchema = z.object({
  weights: z.object({
    recency: z.number().min(0).max(1).optional(),
    topicRelevance: z.number().min(0).max(1).optional(),
    discussionPotential: z.number().min(0).max(1).optional(),
    sourceQuality: z.number().min(0).max(1).optional()
  }).optional(),
  forceAi: z.boolean().optional()
});

export const evaluateBatchSchema = z.object({
  topicId: z.string().optional(),
  articleIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(50).optional()
});

export const rejectNewsSchema = z.object({
  reason: z.string().optional()
});

export const updateResearchSchema = z.object({
  userNotes: z.string().optional(),
  mainEvent: z.string().optional(),
  summary: z.string().optional(),
  keyFacts: z.array(z.string()).optional(),
  importantNumbers: z.array(z.string()).optional(),
  confirmedClaims: z.array(z.string()).optional(),
  uncertainClaims: z.array(z.string()).optional(),
  industryImpact: z.string().optional(),
  possibleAngles: z.array(z.string()).optional()
});

export default {
  discoverNewsSchema,
  newsQuerySchema,
  updateNewsSchema,
  evaluateNewsSchema,
  evaluateBatchSchema,
  rejectNewsSchema,
  updateResearchSchema
};
