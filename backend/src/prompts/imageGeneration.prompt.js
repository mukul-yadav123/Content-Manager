/**
 * AI Image Generation Prompt Builder
 * Generates detailed visual prompts for the OpenAI Image API (DALL-E 3)
 * Suitable for high-engagement, professional LinkedIn thought leadership posts.
 */

export const IMAGE_STYLE_DESCRIPTIONS = {
  editorial:
    'A high-end professional editorial photograph with cinematic lighting, elegant depth of field, refined color grading, sophisticated corporate ambiance, and pristine visual realism.',
  tech_illustration:
    'A sleek modern technology illustration featuring clean isometric architectural perspectives, subtle glowing circuits, modular software elements, and a clean contemporary aesthetic.',
  business_illustration:
    'A contemporary executive business illustration with sophisticated navy and slate tones, clean geometric character silhouettes, strategic collaboration motifs, and flat modern art direction.',
  news_graphic:
    'A high-impact news editorial graphic with dynamic visual tension, dramatic focal lighting, balanced composition, and authoritative journalistic presentation.',
  data_visual:
    'An elegant 3D abstract data visualization featuring glowing interconnected nodes, subtle mathematical depth, luminous flowing metric lines, and pristine structural geometry.',
  minimalist_concept:
    'A striking minimalist conceptual graphic inspired by Swiss and Bauhaus design, featuring stark geometric shapes, high negative space, high contrast, and a single powerful metaphorical focal point.'
};

export const STRICT_NEGATIVE_IMAGE_INSTRUCTIONS =
  'CRITICAL MANDATORY RULES: Strictly NO text, NO letters, NO numbers, NO words, NO typography, NO watermarks, NO fake corporate logos, NO distorted anatomy. Pure visual artwork only.';

/**
 * Builds a prompt for DALL-E 3
 */
export const buildImagePrompt = ({
  concept = '',
  headline = '',
  summary = '',
  style = 'editorial',
  aspectRatio = '1:1'
}) => {
  const stylePrefix = IMAGE_STYLE_DESCRIPTIONS[style] || IMAGE_STYLE_DESCRIPTIONS.editorial;
  const coreSubject = concept || headline || summary || 'Strategic technological innovation';

  const prompt = `${stylePrefix} Visual Subject: ${coreSubject}. Composition: Balanced, professional, premium lighting, LinkedIn-appropriate business aesthetic. ${STRICT_NEGATIVE_IMAGE_INSTRUCTIONS}`;

  const size = aspectRatio === '16:9' ? '1792x1024' : '1024x1024';

  return {
    prompt,
    size,
    model: 'dall-e-3',
    quality: 'standard',
    style
  };
};

/**
 * Prompt for OpenAI LLM to synthesize a creative visual concept from the post
 */
export const buildConceptSynthesisPrompt = ({
  headline,
  postContent,
  topicName,
  contentAngle,
  style = 'editorial'
}) => {
  return {
    system: `You are an executive creative director for top-tier LinkedIn publications.
Your job is to translate complex business and technology news into a single, compelling visual concept suitable for AI image generation.

RULES FOR VISUAL CONCEPTS:
1. NO TEXT IN IMAGES: Never suggest placing words, titles, statistics, or banners inside the visual.
2. STRONG METAPHORS: Focus on tangible physical metaphors, architectural analogies, luminous data structures, or human strategic interactions.
3. NO MISLEADING DEPICTIONS: Do not fabricate sensationalist scenes or fake brand logos.
4. ELEGANT AESTHETICS: Ensure the visual is sophisticated, professional, and enhances the LinkedIn post.

Respond ONLY with a JSON object.`,
    user: `Synthesize an image concept for the following post:
Headline: ${headline}
Topic: ${topicName || 'Technology & Business'}
Angle: ${contentAngle || 'Strategic Overview'}
Post Body:
${postContent.substring(0, 600)}...

Target Visual Style: ${style} (${IMAGE_STYLE_DESCRIPTIONS[style] || ''})

Return strictly a JSON object:
{
  "concept": "A 1-2 sentence visual description focusing on metaphor, composition, and mood.",
  "detailedPrompt": "A complete, detailed DALL-E 3 prompt incorporating the selected style, subject, lighting, and negative text instructions.",
  "style": "${style}",
  "altText": "A concise accessibility alt text describing the image for screen readers (under 120 chars)."
}`
  };
};

export default {
  IMAGE_STYLE_DESCRIPTIONS,
  STRICT_NEGATIVE_IMAGE_INSTRUCTIONS,
  buildImagePrompt,
  buildConceptSynthesisPrompt
};
