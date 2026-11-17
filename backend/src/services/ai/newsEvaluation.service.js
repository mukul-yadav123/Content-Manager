import { getOpenAIClient } from './openai.service.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import {
  NEWS_EVALUATION_SYSTEM_PROMPT,
  buildNewsEvaluationUserPrompt
} from '../../prompts/newsEvaluation.prompt.js';
import {
  calculateTopicRelevanceScore,
  calculateDiscussionPotentialScore
} from '../news/newsRanking.service.js';

/**
 * Evaluate an article using OpenAI for semantic relevance and LinkedIn discussion potential
 */
export const evaluateArticleWithAI = async ({
  title,
  summary,
  publisher,
  facts = [],
  topicName = '',
  topicCategory = '',
  topicKeywords = []
}) => {
  const isMock = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes('mock') || env.OPENAI_API_KEY.includes('replace');

  if (isMock) {
    logger.debug('OpenAI key is mock or unconfigured. Using deterministic heuristic evaluation.');
    return generateHeuristicEvaluation({
      title,
      summary,
      publisher,
      facts,
      topicName,
      topicCategory,
      topicKeywords
    });
  }

  try {
    const openai = getOpenAIClient();
    const userPrompt = buildNewsEvaluationUserPrompt({
      title,
      summary,
      publisher,
      facts,
      topicName,
      topicCategory,
      topicKeywords
    });

    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: NEWS_EVALUATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty evaluation response from OpenAI');
    }

    const parsed = JSON.parse(content);
    return {
      topicRelevanceScore: Math.min(100, Math.max(0, parsed.topicRelevanceScore ?? 80)),
      discussionPotentialScore: Math.min(100, Math.max(0, parsed.discussionPotentialScore ?? 75)),
      shortlistReason: parsed.shortlistReason || 'High relevance to targeted industry trends and leadership debate.',
      linkedInAngle: parsed.linkedInAngle || 'Focuses on strategic industry decisions and trade-offs.',
      keyDiscussionHooks: Array.isArray(parsed.keyDiscussionHooks) ? parsed.keyDiscussionHooks : [],
      targetAudience: parsed.targetAudience || 'Tech and Business Professionals'
    };
  } catch (error) {
    logger.warn(`OpenAI article evaluation failed (${error.message}). Falling back to heuristic evaluation.`);
    return generateHeuristicEvaluation({
      title,
      summary,
      publisher,
      facts,
      topicName,
      topicCategory,
      topicKeywords
    });
  }
};

/**
 * Deterministic heuristic evaluation used during offline tests or when AI is unavailable
 */
export const generateHeuristicEvaluation = ({
  title,
  summary,
  publisher = 'Web Intelligence',
  facts = [],
  topicName = '',
  topicCategory = '',
  topicKeywords = []
}) => {
  const relevance = calculateTopicRelevanceScore({
    title,
    summary,
    facts,
    topicKeywords,
    topicName,
    topicCategory
  });

  const discussion = calculateDiscussionPotentialScore({
    title,
    summary,
    facts
  });

  const isHighDiscussion = discussion >= 75;
  const shortlistReason = isHighDiscussion
    ? `Strong strategic discussion value with high relevance to ${topicName || 'industry'} and leadership benchmarks.`
    : `Relevant story covering ongoing updates in ${topicName || 'the sector'} from ${publisher}.`;

  const linkedInAngle = isHighDiscussion
    ? 'Highlight the architectural and operational trade-offs, then ask peers how their teams are adapting.'
    : 'Summarize the 3 core takeaways and offer a perspective on where this segment is heading next.';

  const hooks = [
    `Are teams ready for this shift, or is it premature optimization?`,
    `What does this mean for developers and engineering leaders in the next 12 months?`
  ];

  return {
    topicRelevanceScore: relevance,
    discussionPotentialScore: discussion,
    shortlistReason,
    linkedInAngle,
    keyDiscussionHooks: hooks,
    targetAudience: 'Software Engineers, Architects & Tech Leaders'
  };
};

export default {
  evaluateArticleWithAI,
  generateHeuristicEvaluation
};

