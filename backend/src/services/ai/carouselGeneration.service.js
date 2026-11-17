import { getOpenAIClient } from './openai.service.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import Carousel from '../../models/Carousel.js';
import ContentDraft from '../../models/ContentDraft.js';
import {
  buildCarouselOutlinePrompt,
  buildRegenerateSlidePrompt
} from '../../prompts/carouselGeneration.prompt.js';

/**
 * High-quality fallback slides for mock/development mode
 */
const generateMockSlides = (title, topic, slideCount = 6) => {
  const boundedCount = Math.max(5, Math.min(7, slideCount));
  const slides = [];

  // Slide 1: Hook Intro
  slides.push({
    slideNumber: 1,
    slideType: 'hook_intro',
    categoryBadge: (topic || 'STRATEGY').toUpperCase(),
    heading: title.length > 50 ? title.substring(0, 50) + '...' : title,
    subheading: 'Why this market shift fundamentally changes enterprise computing.',
    bodyText: 'Most leaders are looking at the headline numbers. Here is the architectural reality.',
    bulletPoints: [],
    statCallout: { value: '', label: '' },
    visualConcept: 'High-contrast computational architecture schematic',
    iconName: 'sparkles'
  });

  // Intermediate Content Slides
  const insights = [
    {
      badge: 'ARCHITECTURAL SHIFT',
      heading: 'The Cost Equation Has Inverted',
      subheading: 'Capital efficiency is displacing raw parameter scale.',
      bodyText: 'Traditional scaling relied on throwing more raw silicon at model weights. The new benchmark is inference efficiency per watt.',
      bulletPoints: [
        'Compute clusters require 40% less thermal footprint',
        'Time-to-first-token latency cut by more than half',
        'Operational margins shift from hardware to software integration'
      ],
      stat: { value: '4.5x', label: 'Higher throughput per cluster' }
    },
    {
      badge: 'ENTERPRISE ADOPTION',
      heading: 'From Experimentation to Production Rails',
      subheading: 'Enterprises are migrating from toy prototypes to core workflows.',
      bodyText: 'Companies that spent 2024 building POCs are finding that deployment economics demand modular architectures.',
      bulletPoints: [
        'Deterministic guardrails replace generic chat interfaces',
        'Local fine-tuned models outperform generalized cloud models',
        'Data sovereignty and auditability become strict prerequisites'
      ],
      stat: { value: '68%', label: 'Of Fortune 500 adopting agentic workflows' }
    },
    {
      badge: 'STRATEGIC MOATS',
      heading: 'Proprietary Data Is the Only Defense',
      subheading: 'Commoditized foundation models mean edge lives in execution.',
      bodyText: 'When open weights rival closed proprietary models within months, defensibility lies entirely in domain workflows and feedback loops.',
      bulletPoints: [
        'Workflow capture beats model weights every time',
        'Domain specific context creates compounding value',
        'Speed of iteration determines market leadership'
      ],
      stat: { value: '12mo', label: 'Average half-life of model superiority' }
    },
    {
      badge: 'GOVERNANCE & RISK',
      heading: 'Auditability Is No Longer Optional',
      subheading: 'Autonomous execution requires verifiable provenance.',
      bodyText: 'Regulatory scrutiny and compliance frameworks require deterministic traceability for every automated business action.',
      bulletPoints: [
        'End-to-end telemetry on token usage and decisions',
        'Automated human-in-the-loop escalation gates',
        'Cryptographic verification of source training data'
      ],
      stat: { value: '99.9%', label: 'Audit compliance requirement' }
    }
  ];

  const contentSlidesNeeded = boundedCount - 3; // Total minus (hook + takeaway + cta)
  for (let i = 0; i < contentSlidesNeeded; i++) {
    const ins = insights[i % insights.length];
    slides.push({
      slideNumber: slides.length + 1,
      slideType: 'content_point',
      categoryBadge: ins.badge,
      heading: ins.heading,
      subheading: ins.subheading,
      bodyText: ins.bodyText,
      bulletPoints: ins.bulletPoints,
      statCallout: ins.stat,
      visualConcept: 'Data node connectivity and strategic progression',
      iconName: 'chart'
    });
  }

  // Slide N-1: Key Takeaway
  slides.push({
    slideNumber: slides.length + 1,
    slideType: 'key_takeaway',
    categoryBadge: 'THE BOTTOM LINE',
    heading: 'Execution Speed Over Model Size',
    subheading: 'Winners will not be those with the largest models.',
    bodyText: 'The organizations dominating the next decade will be those that integrate domain data into automated feedback loops fastest.',
    bulletPoints: [
      'Stop waiting for the next frontier model release',
      'Invest aggressively in internal data pipeline ergonomics',
      'Empower cross-functional operators with modular tools'
    ],
    statCallout: { value: '', label: '' },
    visualConcept: 'Clear strategic roadmap banner with forward arrow',
    iconName: 'target'
  });

  // Slide N: Closing CTA
  slides.push({
    slideNumber: slides.length + 1,
    slideType: 'closing_cta',
    categoryBadge: 'JOIN THE CONVERSATION',
    heading: 'How is your team navigating this shift?',
    subheading: 'Are you optimizing for raw compute or domain integration?',
    bodyText: 'Share your perspective in the comments below. Follow for weekly strategic breakdowns on enterprise AI.',
    bulletPoints: [],
    statCallout: { value: '', label: '' },
    visualConcept: 'Author signature connect card and discussion bubble',
    iconName: 'users'
  });

  return slides;
};

/**
 * Generates Carousel content from a draft or article
 */
export const generateCarouselContent = async ({
  draftId = null,
  articleId = null,
  slideCount = 6,
  theme = 'modern_navy',
  aspectRatio = '4:5',
  customInstructions = '',
  user = null
}) => {
  let draft = null;
  let article = null;

  if (draftId) {
    draft = await ContentDraft.findById(draftId).populate('newsArticleId').populate('topicId');
    if (draft && draft.newsArticleId) {
      article = draft.newsArticleId;
    }
  }

  const postTitle = draft?.title || article?.title || 'Executive Strategic Breakdown';
  const postHook = draft?.hook || article?.summary || '';
  const postBody = draft?.body || article?.content || '';
  const keyTakeaways = draft?.keyTakeaways || article?.importantFacts || [];
  const researchSummary = article?.deepResearch?.summary || article?.summary || '';
  const topic = draft?.topicId?.name || article?.topic || 'Technology & Business Strategy';

  const isMock = !env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'mock_openai_api_key' || env.OPENAI_API_KEY.includes('test');

  let generatedSlides = [];
  let carouselTitle = postTitle;

  if (isMock) {
    logger.info('OpenAI key is mock or unset. Using curated structured carousel fallback.');
    generatedSlides = generateMockSlides(postTitle, topic, slideCount);
  } else {
    try {
      logger.info(`Calling OpenAI to generate ${slideCount}-slide carousel for "${postTitle}"`);
      const openai = getOpenAIClient();
      const { systemPrompt, userPrompt } = buildCarouselOutlinePrompt({
        postTitle,
        postHook,
        postBody,
        keyTakeaways,
        researchSummary,
        topic,
        slideCount,
        customInstructions
      });

      const response = await openai.chat.completions.create({
        model: env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      if (parsed.carouselTitle) carouselTitle = parsed.carouselTitle;
      if (Array.isArray(parsed.slides) && parsed.slides.length >= 5) {
        generatedSlides = parsed.slides;
      } else {
        generatedSlides = generateMockSlides(postTitle, topic, slideCount);
      }
    } catch (err) {
      logger.warn(`OpenAI carousel synthesis error (${err.message}). Using fallback slides.`);
      generatedSlides = generateMockSlides(postTitle, topic, slideCount);
    }
  }

  // Ensure dimensions match aspect ratio
  const dimensions =
    aspectRatio === '1:1'
      ? { width: 1080, height: 1080 }
      : { width: 1080, height: 1350 };

  // Create Carousel in MongoDB
  const carousel = new Carousel({
    userId: user?._id || user?.id,
    contentDraftId: draft?._id || null,
    newsArticleId: article?._id || null,
    title: carouselTitle,
    topic,
    theme,
    slideCount: generatedSlides.length,
    aspectRatio,
    dimensions,
    author: {
      name: user?.name || 'Thought Leader',
      headline: user?.headline || 'Tech & Business Strategist',
      handle: user?.email ? `@${user.email.split('@')[0]}` : '@thoughtleader'
    },
    slides: generatedSlides,
    status: 'ready',
    isRendered: false
  });

  await carousel.save();

  // If linked to a draft, sync carousel slides and carouselId reference
  if (draft) {
    draft.carouselId = carousel._id;
    draft.carouselSlides = generatedSlides.map((s) => ({
      slideNumber: s.slideNumber,
      title: s.heading,
      content: `${s.subheading ? s.subheading + '\n' : ''}${s.bodyText || ''}`
    }));
    await draft.save();
  }

  logger.info(`Successfully created Carousel ${carousel._id} with ${generatedSlides.length} slides`);
  return carousel;
};

/**
 * Regenerates an individual slide using AI
 */
export const regenerateSingleSlide = async ({
  carousel,
  slideIndex,
  instructions = ''
}) => {
  if (!carousel || !carousel.slides || !carousel.slides[slideIndex]) {
    throw new Error('Slide not found in carousel');
  }

  const currentSlide = carousel.slides[slideIndex];
  const slideNum = currentSlide.slideNumber;
  const isMock = !env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'mock_openai_api_key' || env.OPENAI_API_KEY.includes('test');

  if (isMock) {
    logger.info(`Regenerating slide ${slideNum} in mock mode.`);
    currentSlide.heading = `${currentSlide.heading} (Refined)`;
    currentSlide.bodyText = `${currentSlide.bodyText} This point has been sharpened for maximum executive engagement.`;
    if (currentSlide.bulletPoints && currentSlide.bulletPoints.length > 0) {
      currentSlide.bulletPoints[0] = `Actionable takeaway: ${currentSlide.bulletPoints[0]}`;
    }
  } else {
    try {
      const openai = getOpenAIClient();
      const { systemPrompt, userPrompt } = buildRegenerateSlidePrompt({
        carouselTitle: carousel.title,
        currentSlide,
        slideNumber: slideNum,
        totalSlides: carousel.slides.length,
        instructions
      });

      const response = await openai.chat.completions.create({
        model: env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.65
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      if (parsed.heading) currentSlide.heading = parsed.heading;
      if (parsed.subheading !== undefined) currentSlide.subheading = parsed.subheading;
      if (parsed.bodyText) currentSlide.bodyText = parsed.bodyText;
      if (Array.isArray(parsed.bulletPoints)) currentSlide.bulletPoints = parsed.bulletPoints;
      if (parsed.statCallout) currentSlide.statCallout = parsed.statCallout;
      if (parsed.categoryBadge) currentSlide.categoryBadge = parsed.categoryBadge;
      if (parsed.visualConcept) currentSlide.visualConcept = parsed.visualConcept;
    } catch (err) {
      logger.warn(`OpenAI slide regeneration error (${err.message}). Using manual refinement.`);
      currentSlide.heading = `${currentSlide.heading} (Enhanced)`;
    }
  }

  // Mark carousel as unrendered since content changed
  carousel.isRendered = false;
  await carousel.save();

  return currentSlide;
};
