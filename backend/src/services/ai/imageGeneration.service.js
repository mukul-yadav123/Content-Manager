import { getOpenAIClient } from './openai.service.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import cloudinaryService from '../storage/cloudinary.service.js';
import MediaAsset from '../../models/MediaAsset.js';
import {
  buildImagePrompt,
  buildConceptSynthesisPrompt,
  IMAGE_STYLE_DESCRIPTIONS
} from '../../prompts/imageGeneration.prompt.js';

/**
 * Synthesize a visual concept and detailed prompt for DALL-E 3
 */
export const synthesizeImagePrompt = async ({
  draft,
  article = null,
  topic = null,
  style = 'editorial',
  concept = ''
}) => {
  const isMock =
    !env.OPENAI_API_KEY ||
    env.OPENAI_API_KEY.includes('mock') ||
    env.OPENAI_API_KEY.includes('replace');

  const headline = draft?.title || article?.title || 'Industry Strategic Milestone';
  const postContent = draft?.body || article?.summary || '';
  const topicName = topic?.name || article?.category || 'Technology';
  const contentAngle = draft?.contentAngle || '';

  // If user provided a specific concept or draft has one, prioritize it
  const activeConcept = concept || draft?.suggestedImageConcept || '';

  if (isMock || activeConcept) {
    const finalConcept = activeConcept || `A symbolic visual representation of ${headline.replace(/\.$/, '')} focusing on strategic impact and operational execution.`;
    const promptObj = buildImagePrompt({
      concept: finalConcept,
      headline,
      style,
      aspectRatio: '1:1'
    });

    return {
      concept: finalConcept,
      prompt: promptObj.prompt,
      style,
      altText: `Editorial visual representing ${headline}`,
      size: promptObj.size
    };
  }

  try {
    const openai = getOpenAIClient();
    const promptBlueprint = buildConceptSynthesisPrompt({
      headline,
      postContent,
      topicName,
      contentAngle,
      style
    });

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: promptBlueprint.system },
        { role: 'user', content: promptBlueprint.user }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    const synthesizedConcept = parsed.concept || `Visual metaphor for ${headline}`;
    const detailedPrompt = parsed.detailedPrompt || buildImagePrompt({ concept: synthesizedConcept, headline, style }).prompt;

    return {
      concept: synthesizedConcept,
      prompt: detailedPrompt,
      style,
      altText: parsed.altText || `Graphic illustration for ${headline}`,
      size: '1024x1024'
    };
  } catch (err) {
    logger.warn(`Concept synthesis via LLM failed (${err.message}). Using standard prompt builder.`);
    const fallbackConcept = `A clean, professional visual metaphor representing ${headline}`;
    const built = buildImagePrompt({ concept: fallbackConcept, headline, style });
    return {
      concept: fallbackConcept,
      prompt: built.prompt,
      style,
      altText: `Visual for ${headline}`,
      size: built.size
    };
  }
};

/**
 * Call OpenAI Image API (DALL-E 3) to generate an image
 */
export const generateImageFromOpenAI = async ({
  prompt,
  size = '1024x1024',
  style = 'editorial',
  model = env.OPENAI_IMAGE_MODEL || 'dall-e-3'
}) => {
  const isMock =
    !env.OPENAI_API_KEY ||
    env.OPENAI_API_KEY.includes('mock') ||
    env.OPENAI_API_KEY.includes('replace');

  if (isMock) {
    logger.info(`OpenAI key is mock or unset. Using curated visual fallback for style "${style}".`);
    const fallbackUrl = cloudinaryService.MOCK_VISUAL_FALLBACKS[style] || cloudinaryService.MOCK_VISUAL_FALLBACKS.editorial;
    return {
      imageUrl: fallbackUrl,
      revisedPrompt: prompt
    };
  }

  try {
    const openai = getOpenAIClient();
    logger.info(`Requesting image from OpenAI Image API (${model}, size: ${size})...`);

    const response = await openai.images.generate({
      model,
      prompt,
      n: 1,
      size,
      quality: 'standard'
    });

    const imageUrl = response.data?.[0]?.url;
    const revisedPrompt = response.data?.[0]?.revised_prompt || prompt;

    if (!imageUrl) {
      throw new Error('No image URL returned by OpenAI Image API.');
    }

    return {
      imageUrl,
      revisedPrompt
    };
  } catch (error) {
    logger.warn(`OpenAI image generation failed (${error.message}). Falling back to safe high-quality asset.`);
    const fallbackUrl = cloudinaryService.MOCK_VISUAL_FALLBACKS[style] || cloudinaryService.MOCK_VISUAL_FALLBACKS.editorial;
    return {
      imageUrl: fallbackUrl,
      revisedPrompt: prompt
    };
  }
};

/**
 * End-to-end generator: Synthesizes prompt, generates via OpenAI, uploads to Cloudinary, and saves in MongoDB
 */
export const generateAndSavePostImage = async ({
  draft,
  article = null,
  topic = null,
  style = 'editorial',
  customPrompt = '',
  concept = '',
  aspectRatio = '1:1',
  userId
}) => {
  // 1. Synthesize visual concept and detailed prompt
  let finalPrompt = customPrompt;
  let finalConcept = concept;
  let altText = `Image visual for ${draft.title}`;

  if (!finalPrompt) {
    const promptData = await synthesizeImagePrompt({
      draft,
      article,
      topic,
      style,
      concept
    });
    finalPrompt = promptData.prompt;
    finalConcept = promptData.concept;
    altText = promptData.altText;
  }

  const dimensions = aspectRatio === '16:9' ? '1792x1024' : '1024x1024';

  // 2. Generate Image via OpenAI
  const { imageUrl, revisedPrompt } = await generateImageFromOpenAI({
    prompt: finalPrompt,
    size: dimensions,
    style,
    model: env.OPENAI_IMAGE_MODEL || 'dall-e-3'
  });

  // 3. Upload to Cloudinary
  const uploadResult = await cloudinaryService.uploadImageFromUrl(
    imageUrl,
    'linkedin-content-studio/posts',
    style
  );

  // 4. Save MediaAsset in MongoDB
  const isFirstImage = !draft.mediaAssets || draft.mediaAssets.length === 0;

  const mediaAsset = await MediaAsset.create({
    userId,
    contentDraftId: draft._id,
    publicId: uploadResult.publicId,
    secureUrl: uploadResult.secureUrl,
    thumbnailUrl: uploadResult.thumbnailUrl || uploadResult.secureUrl,
    assetType: 'single-image',
    imageStyle: style,
    generationModel: env.OPENAI_IMAGE_MODEL || 'dall-e-3',
    format: uploadResult.format || 'webp',
    width: uploadResult.width || 1024,
    height: uploadResult.height || 1024,
    bytes: uploadResult.bytes || 0,
    promptUsed: finalPrompt,
    revisedPrompt: revisedPrompt || finalPrompt,
    concept: finalConcept,
    aspectRatio,
    altText,
    isPreferred: isFirstImage,
    metadata: {
      draftTitle: draft.title,
      styleDescription: IMAGE_STYLE_DESCRIPTIONS[style] || style,
      generatedAt: new Date()
    }
  });

  // 5. Associate with Draft
  draft.mediaAssets.push(mediaAsset._id);
  if (isFirstImage || !draft.selectedMediaAsset) {
    draft.selectedMediaAsset = mediaAsset._id;
  }
  await draft.save();

  logger.info(`Successfully created and associated MediaAsset ${mediaAsset._id} with draft ${draft._id}`);
  return mediaAsset;
};

export default {
  synthesizeImagePrompt,
  generateImageFromOpenAI,
  generateAndSavePostImage
};

