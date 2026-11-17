import { getOpenAIClient } from './openai.service.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import {
  LINKEDIN_GENERATION_SYSTEM_PROMPT,
  buildThreeApproachesUserPrompt,
  buildRegenerateHooksPrompt,
  buildRegenerateSingleApproachPrompt
} from '../../prompts/postGeneration.prompt.js';
import {
  threeApproachesOutputSchema,
  singleVariationOutputSchema,
  regeneratedHooksOutputSchema
} from '../../schemas/studio.schema.js';

/**
 * Clean markdown fencing from OpenAI JSON string
 */
const cleanJsonString = (str) => {
  if (!str) return '{}';
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
};

/**
 * Generate three distinct LinkedIn post approaches:
 * 1. News Update
 * 2. Industry Analysis
 * 3. Professional Opinion
 */
export const generateLinkedInPosts = async ({
  article,
  research = null,
  topic = null,
  targetAudience = 'Industry professionals and decision makers',
  contentAngle = '',
  preferredStyle = 'authoritative',
  postFormat = 'standard'
}) => {
  const isMock =
    !env.OPENAI_API_KEY ||
    env.OPENAI_API_KEY.includes('mock') ||
    env.OPENAI_API_KEY.includes('replace');

  if (isMock) {
    logger.info(
      `OpenAI key is mock or unset. Generating high-quality deterministic variations for "${article.title.substring(0, 40)}...".`
    );
    return generateStructuredPostsFallback({
      article,
      research,
      topic,
      targetAudience,
      contentAngle,
      preferredStyle
    });
  }

  try {
    const openai = getOpenAIClient();
    const userPrompt = buildThreeApproachesUserPrompt({
      article,
      research,
      topic,
      targetAudience,
      contentAngle,
      preferredStyle
    });

    let rawJsonContent = null;

    // 1. Attempt OpenAI Responses API if available
    if (openai.responses && typeof openai.responses.create === 'function') {
      try {
        const response = await openai.responses.create({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          instructions: LINKEDIN_GENERATION_SYSTEM_PROMPT,
          input: userPrompt
        });
        rawJsonContent = response.output_text;
      } catch (respErr) {
        logger.warn(`OpenAI responses.create post generation failed (${respErr.message}). Falling back to chat.completions.`);
      }
    }

    // 2. Chat Completions fallback
    if (!rawJsonContent) {
      const completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: LINKEDIN_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });
      rawJsonContent = completion.choices?.[0]?.message?.content;
    }

    if (!rawJsonContent) {
      throw new Error('Empty response received from OpenAI post generation API.');
    }

    const clean = cleanJsonString(rawJsonContent);
    const parsed = JSON.parse(clean);

    // Validate with Zod
    const validated = threeApproachesOutputSchema.parse(parsed);

    // Transform into standard variations array
    const variations = [
      formatVariationItem('var-news-update', validated.newsUpdate, article),
      formatVariationItem('var-industry-analysis', validated.industryAnalysis, article),
      formatVariationItem('var-professional-opinion', validated.professionalOpinion, article)
    ];

    return {
      variations,
      selectedApproach: 'news_update',
      targetAudience,
      contentAngle,
      preferredStyle
    };
  } catch (error) {
    logger.warn(`Live post generation failed (${error.message}). Falling back to deterministic generation.`);
    return generateStructuredPostsFallback({
      article,
      research,
      topic,
      targetAudience,
      contentAngle,
      preferredStyle
    });
  }
};

/**
 * Regenerate 3 new hooks for a specific approach
 */
export const regenerateHooksForApproach = async ({
  approach,
  article,
  currentPostContent,
  targetAudience = 'Industry professionals',
  contentAngle = ''
}) => {
  const isMock =
    !env.OPENAI_API_KEY ||
    env.OPENAI_API_KEY.includes('mock') ||
    env.OPENAI_API_KEY.includes('replace');

  if (isMock) {
    return generateFallbackHooks(approach, article, contentAngle);
  }

  try {
    const openai = getOpenAIClient();
    const prompt = buildRegenerateHooksPrompt({
      approach,
      article,
      currentPostContent,
      targetAudience,
      contentAngle
    });

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    });

    const raw = completion.choices?.[0]?.message?.content;
    const clean = cleanJsonString(raw);
    const parsed = JSON.parse(clean);
    const validated = regeneratedHooksOutputSchema.parse(parsed);

    return validated.hookOptions;
  } catch (err) {
    logger.warn(`Live hook regeneration failed (${err.message}). Using fallback hooks.`);
    return generateFallbackHooks(approach, article, contentAngle);
  }
};

/**
 * Regenerate a single post approach with modified parameters
 */
export const regenerateSingleApproach = async ({
  approach,
  article,
  research = null,
  topic = null,
  targetAudience,
  contentAngle,
  preferredStyle
}) => {
  const isMock =
    !env.OPENAI_API_KEY ||
    env.OPENAI_API_KEY.includes('mock') ||
    env.OPENAI_API_KEY.includes('replace');

  if (isMock) {
    const fallbackAll = generateStructuredPostsFallback({
      article,
      research,
      topic,
      targetAudience,
      contentAngle,
      preferredStyle
    });
    return fallbackAll.variations.find((v) => v.approach === approach) || fallbackAll.variations[0];
  }

  try {
    const openai = getOpenAIClient();
    const prompt = buildRegenerateSingleApproachPrompt({
      approach,
      article,
      research,
      topic,
      targetAudience,
      contentAngle,
      preferredStyle
    });

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const raw = completion.choices?.[0]?.message?.content;
    const clean = cleanJsonString(raw);
    const parsed = JSON.parse(clean);
    const validated = singleVariationOutputSchema.parse(parsed);

    return formatVariationItem(`var-${approach}-${Date.now()}`, validated, article);
  } catch (err) {
    logger.warn(`Live single approach regeneration failed (${err.message}). Using fallback.`);
    const fallbackAll = generateStructuredPostsFallback({
      article,
      research,
      topic,
      targetAudience,
      contentAngle,
      preferredStyle
    });
    return fallbackAll.variations.find((v) => v.approach === approach) || fallbackAll.variations[0];
  }
};

/**
 * Formats validated variation item into standard database-ready structure
 */
function formatVariationItem(id, item, article) {
  const hooks = Array.isArray(item.hookOptions) && item.hookOptions.length > 0 ? item.hookOptions : ['Important update regarding recent developments.'];
  const attribution = item.sourceAttribution || `Source: ${article.publisher || 'Verified Reporting'} (${article.sourceUrl || ''})`;

  return {
    variationId: id,
    approach: item.approach,
    approachLabel: item.approachLabel || getApproachLabel(item.approach),
    headline: item.headline || article.title,
    hookOptions: hooks,
    selectedHook: hooks[0],
    content: item.content,
    keyTakeaways: Array.isArray(item.keyTakeaways) ? item.keyTakeaways : [],
    closingQuestion: item.closingQuestion || 'What are your thoughts on this development?',
    hashtags: Array.isArray(item.hashtags) ? item.hashtags : ['#IndustryNews', '#Strategy', '#Leadership'],
    sourceAttribution: attribution,
    suggestedImageConcept: item.suggestedImageConcept || 'Editorial photo or clean metric infographic summarizing key data.'
  };
}

function getApproachLabel(approach) {
  switch (approach) {
    case 'news_update':
      return 'News Update';
    case 'industry_analysis':
      return 'Industry Analysis';
    case 'professional_opinion':
      return 'Professional Opinion';
    default:
      return 'Content Variation';
  }
}

/**
 * Deterministic Fallback Generator
 * Produces structured, accurate posts adhering strictly to content rules
 */
export function generateStructuredPostsFallback({
  article,
  research = null,
  topic = null,
  targetAudience = 'Industry professionals and decision makers',
  contentAngle = '',
  preferredStyle = 'authoritative'
}) {
  const researchData = research || article.deepResearch || {};
  const topicName = topic?.name || article.category || 'Industry';
  const publisher = article.publisher || 'Official Reports';
  const cleanTitle = article.title.trim().replace(/\.$/, '');

  // Extract metrics or key facts
  const facts = Array.isArray(researchData.confirmedClaims) && researchData.confirmedClaims.length > 0
    ? researchData.confirmedClaims.map(c => typeof c === 'string' ? c : c.claim)
    : (Array.isArray(researchData.keyFacts) && researchData.keyFacts.length > 0
      ? researchData.keyFacts
      : (article.keyFacts || [article.summary || 'Major developments announced.']));

  const primaryFact = facts[0] || article.summary || 'Significant industry milestone announced.';
  const secondaryFact = facts[1] || 'Teams across the sector are evaluating strategic adjustments.';
  const thirdFact = facts[2] || 'Further details are emerging regarding implementation timelines.';

  const numberMetrics = Array.isArray(researchData.importantNumbers) ? researchData.importantNumbers : [];
  const metricHighlight = numberMetrics.length > 0
    ? (typeof numberMetrics[0] === 'string' ? numberMetrics[0] : `${numberMetrics[0].metric || numberMetrics[0].value}: ${numberMetrics[0].context || ''}`)
    : null;

  const cleanTags = [
    `#${topicName.replace(/[^a-zA-Z0-9]/g, '')}`,
    '#BusinessStrategy',
    '#IndustryInsights',
    '#Leadership'
  ].slice(0, 4);

  const angleContext = contentAngle ? `Focusing on ${contentAngle.toLowerCase()}, ` : '';

  // 1. News Update Variation
  const newsHooks = [
    metricHighlight
      ? `${metricHighlight}. Here is why ${cleanTitle} matters today:`
      : `${cleanTitle}: What happened and why it matters to ${topicName.toLowerCase()} leaders:`,
    `A significant milestone just developed in ${topicName.toLowerCase()}: ${cleanTitle}.`,
    `${publisher} recently reported on ${cleanTitle}. Here are the verified facts without the noise:`
  ];

  const newsContent = `${primaryFact}

According to confirmed reporting from ${publisher}, this development represents a clear inflection point for the sector.

Here is the operational breakdown:
• Core Development: ${primaryFact}
• Industry Context: ${secondaryFact}
• Current Status: ${thirdFact}

${angleContext}teams that rely on these systems should monitor near-term updates closely.`;

  const newsVariation = {
    variationId: 'var-news-update',
    approach: 'news_update',
    approachLabel: 'News Update',
    headline: `What Happened: ${cleanTitle}`,
    hookOptions: newsHooks,
    selectedHook: newsHooks[0],
    content: newsContent,
    keyTakeaways: [
      `Confirmed: ${primaryFact}`,
      `Timeline: ${secondaryFact}`,
      `Next milestone: Ongoing evaluations across the sector`
    ],
    closingQuestion: `How is your team evaluating this update in your planning for the quarter?`,
    hashtags: cleanTags,
    sourceAttribution: `Source: ${publisher} (${article.sourceUrl || ''})`,
    suggestedImageConcept: `A clean 2-column breakdown graphic comparing the previous baseline against the new milestone with key numbers highlighted.`
  };

  // 2. Industry Analysis Variation
  const analysisHooks = [
    `The immediate headlines focused on ${cleanTitle}. The real story is the downstream impact on ${topicName.toLowerCase()}.`,
    `Beyond the surface announcement, three strategic shifts are now underway following ${cleanTitle}.`,
    `If you operate in ${topicName.toLowerCase()}, the recent reporting by ${publisher} signals a broader transition.`
  ];

  const analysisContent = `When news like "${cleanTitle}" breaks, the initial coverage often stays at the surface level.

Looking at the broader implications, several key dynamics emerge:

1. Structural Realignment
${primaryFact} This introduces new operational expectations across existing workflows.

2. Competitive Impact
${secondaryFact} Organizations positioned to adapt quickly will gain notable leverage.

3. Execution Friction
${thirdFact} The transition will require deliberate resource allocation rather than passive observation.

${angleContext}the critical question is not whether the market is shifting, but which teams will adjust their execution roadmaps first.`;

  const analysisVariation = {
    variationId: 'var-industry-analysis',
    approach: 'industry_analysis',
    approachLabel: 'Industry Analysis',
    headline: `Strategic Breakdown: The Real Impact of ${cleanTitle}`,
    hookOptions: analysisHooks,
    selectedHook: analysisHooks[0],
    content: analysisContent,
    keyTakeaways: [
      `Structural shift: Market expectations are resetting around verified capabilities.`,
      `Competitive moat: Early adopters will establish clear operational advantages.`,
      `Downstream ripple: Upstream dependencies will require updated integration strategies.`
    ],
    closingQuestion: `Which of these three downstream shifts will have the greatest impact on your roadmap?`,
    hashtags: cleanTags,
    sourceAttribution: `Source: ${publisher} (${article.sourceUrl || ''})`,
    suggestedImageConcept: `A clean ecosystem diagram or workflow flowchart illustrating upstream changes and ripple effects across market participants.`
  };

  // 3. Professional Opinion Variation
  const opinionHooks = [
    `There is a critical nuance being overlooked in the discussion around ${cleanTitle}.`,
    `The industry consensus on ${cleanTitle} misses an important tradeoff.`,
    `As discussion grows regarding ${cleanTitle}, here is a pragmatic perspective based on the facts:`
  ];

  const opinionContent = `Public discussions regarding ${cleanTitle} tend to split between premature hype and excessive skepticism.

Examining the verified evidence offers a more balanced perspective:

The facts:
• ${primaryFact}
• ${secondaryFact}

The pragmatic reality:
Adopting new paradigms always incurs hidden operational costs. While the long-term potential is tangible, teams that succeed will be those that address the implementation tradeoffs upfront rather than assuming instant results.

${angleContext}deliberate, steady execution beats rushed adoption every time.`;

  const opinionVariation = {
    variationId: 'var-professional-opinion',
    approach: 'professional_opinion',
    approachLabel: 'Professional Opinion',
    headline: `A Pragmatic Perspective: ${cleanTitle}`,
    hookOptions: opinionHooks,
    selectedHook: opinionHooks[0],
    content: opinionContent,
    keyTakeaways: [
      `Look past superficial commentary to the verifiable facts.`,
      `Pragmatic execution always outpaces uncalibrated speculation.`,
      `Strategic patience and calculated experiments yield the best ROI.`
    ],
    closingQuestion: `Where do you see the biggest gap between theoretical promise and real-world execution on this front?`,
    hashtags: cleanTags,
    sourceAttribution: `Source: ${publisher} (${article.sourceUrl || ''})`,
    suggestedImageConcept: `A high-contrast quote card highlighting the core strategic tradeoff with subtle branding.`
  };

  return {
    variations: [newsVariation, analysisVariation, opinionVariation],
    selectedApproach: 'news_update',
    targetAudience,
    contentAngle,
    preferredStyle
  };
}

/**
 * Generate fallback hooks when live API is unavailable
 */
function generateFallbackHooks(approach, article, contentAngle) {
  const title = article.title.replace(/\.$/, '');
  const angleStr = contentAngle ? ` (${contentAngle})` : '';

  switch (approach) {
    case 'news_update':
      return [
        `Verified update: Here is what the latest reporting on ${title} means for your team${angleStr}:`,
        `${article.publisher || 'Reports'} confirmed major movements in ${title}. The key facts:`,
        `If you have not caught up on ${title}, here is the 2-minute executive brief:`
      ];
    case 'industry_analysis':
      return [
        `The headlines missed the most important implication of ${title}.`,
        `Three downstream consequences of ${title} that every decision-maker should track:`,
        `How ${title} is quietly reshaping the competitive landscape in ${article.category || 'tech'}:`
      ];
    case 'professional_opinion':
      return [
        `A contrarian observation regarding ${title}:`,
        `The prevailing take on ${title} is missing a fundamental tradeoff.`,
        `Before rushing to implement changes based on ${title}, consider this perspective:`
      ];
    default:
      return [
        `Key developments regarding ${title}:`,
        `Why industry leaders are paying close attention to ${title}:`,
        `The strategic takeaway from ${title}:`
      ];
  }
}

export default {
  generateLinkedInPosts,
  regenerateHooksForApproach,
  regenerateSingleApproach,
  generateStructuredPostsFallback
};

