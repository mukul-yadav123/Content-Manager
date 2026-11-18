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

  // Extract the target visual concept: check explicit param, active variation, or draft
  const activeVariation =
    draft?.variations?.find((v) => v.approach === draft?.selectedApproach) ||
    draft?.variations?.[0];
  const effectiveConcept =
    (concept && concept.trim()) ||
    activeVariation?.suggestedImageConcept ||
    draft?.suggestedImageConcept ||
    '';

  // If a visual concept is provided or exists on the draft (e.g. "A headshot of Jensen Huang alongside a graphic of Nvidia's logo."):
  // Build a prompt that pairs the selected visual style directly with this exact visual subject
  if (effectiveConcept) {
    const promptObj = buildImagePrompt({
      concept: effectiveConcept,
      headline,
      style,
      aspectRatio: '1:1'
    });

    return {
      concept: effectiveConcept,
      prompt: promptObj.prompt,
      style,
      altText: `${style.replace(/_/g, ' ')} – ${effectiveConcept.substring(0, 120)}`,
      size: promptObj.size
    };
  }

  // If no concept was available at all: synthesize via OpenAI LLM (if key configured)
  if (!isMock) {
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
        altText: parsed.altText || `${style.replace(/_/g, ' ')} illustration for ${headline}`,
        size: '1024x1024'
      };
    } catch (err) {
      logger.warn(`Concept synthesis via LLM failed (${err.message}). Using standard prompt builder.`);
    }
  }

  // Standard fallback when no concept and LLM is mock or failed
  const fallbackConcept = `A clean, professional ${style.replace(/_/g, ' ')} representing ${headline}`;
  const built = buildImagePrompt({ concept: fallbackConcept, headline, style });
  return {
    concept: fallbackConcept,
    prompt: built.prompt,
    style,
    altText: `${style.replace(/_/g, ' ')} visual for ${headline}`,
    size: built.size
  };
};

/**
 * Call OpenAI Image API to generate an image based strictly on post content
 */
export const generateImageFromOpenAI = async ({
  prompt,
  size = '1024x1024',
  style = 'editorial',
  model = env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini'
}) => {
  const isMock =
    !env.OPENAI_API_KEY ||
    env.OPENAI_API_KEY.includes('mock') ||
    env.OPENAI_API_KEY.includes('replace');

  if (isMock) {
    logger.info(`OpenAI key is mock or unset. Generating content-matched visual for: "${prompt.substring(0, 60)}..."`);
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 200));
    const dynamicUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
    return {
      imageUrl: dynamicUrl,
      revisedPrompt: prompt
    };
  }

  // Model cascade: prioritize configured model, fallback to modern project models
  const candidateModels = [
    model,
    'gpt-image-1-mini',
    'gpt-image-1.5',
    'chatgpt-image-latest',
    'dall-e-3'
  ].filter(Boolean);
  const uniqueModels = [...new Set(candidateModels)];

  const openai = getOpenAIClient();
  let lastError = null;

  for (const targetModel of uniqueModels) {
    try {
      const isDalle = targetModel.startsWith('dall-e');
      let effectiveSize = size;
      if (!isDalle && effectiveSize === '1792x1024') {
        effectiveSize = '1536x1024';
      }

      logger.info(`Requesting image from OpenAI Image API (${targetModel}, size: ${effectiveSize})...`);

      const generateParams = {
        model: targetModel,
        prompt,
        n: 1,
        size: effectiveSize
      };

      if (isDalle) {
        generateParams.quality = 'standard';
      } else {
        generateParams.quality = 'auto';
      }

      const response = await openai.images.generate(generateParams);

      const item = response.data?.[0];
      const imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
      const revisedPrompt = item?.revised_prompt || prompt;

      if (!imageUrl) {
        throw new Error(`No image URL or b64_json returned by OpenAI (${targetModel}).`);
      }

      logger.info(`Successfully generated content image using OpenAI model: ${targetModel}`);
      return {
        imageUrl,
        revisedPrompt,
        modelUsed: targetModel
      };
    } catch (error) {
      lastError = error;
      logger.warn(`OpenAI image generation failed with ${targetModel} (${error.message}).`);
      // If error is model does not exist or invalid_value, continue to next model in cascade
      if (error.status === 400 || error.message?.includes('does not exist')) {
        continue;
      }
      break;
    }
  }

  // Fallback: If OpenAI API models fail, generate dynamic visual matched to the post content
  logger.warn(`All OpenAI image models failed (${lastError?.message}). Using content-matched visual fallback.`);
  const encodedPrompt = encodeURIComponent(prompt.substring(0, 200));
  const dynamicFallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

  return {
    imageUrl: dynamicFallbackUrl,
    revisedPrompt: prompt,
    modelUsed: 'content-matched-visual'
  };
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
  const { imageUrl, revisedPrompt, modelUsed } = await generateImageFromOpenAI({
    prompt: finalPrompt,
    size: dimensions,
    style,
    model: env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini'
  });

  // Update concept and altText to reflect the ACTUAL generated image, not stale draft hints.
  // If OpenAI returned a revised prompt, use it as the concept since it describes
  // what was actually generated. Otherwise keep the synthesized concept.
  if (revisedPrompt && revisedPrompt !== finalPrompt) {
    // OpenAI revised the prompt; use a shortened version as the concept
    finalConcept = revisedPrompt.length > 300
      ? revisedPrompt.substring(0, 297) + '...'
      : revisedPrompt;
  }
  // Update altText to match the actual concept
  const styleLabel = style.replace(/_/g, ' ');
  altText = finalConcept
    ? `${styleLabel} – ${finalConcept.substring(0, 120)}`
    : `${styleLabel} visual for ${draft.title}`;

  // 3. Upload to Cloudinary
  const uploadResult = await cloudinaryService.uploadImageFromUrl(
    imageUrl,
    'linkedin-content-studio/posts',
    style
  );

  // 4. Save MediaAsset in MongoDB with Cloudinary rollback protection
  const isFirstImage = !draft.mediaAssets || draft.mediaAssets.length === 0;

  let mediaAsset;
  try {
    mediaAsset = await MediaAsset.create({
      userId,
      contentDraftId: draft._id,
      publicId: uploadResult.publicId,
      secureUrl: uploadResult.secureUrl,
      thumbnailUrl: uploadResult.thumbnailUrl || uploadResult.secureUrl,
      assetType: 'single-image',
      imageStyle: style,
      generationModel: modelUsed || env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini',
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
  } catch (dbError) {
    // Rollback uploaded Cloudinary asset if database persistence fails
    if (uploadResult?.publicId) {
      await cloudinaryService.deleteImage(uploadResult.publicId).catch((err) => {
        logger.warn(`Failed to cleanup orphaned Cloudinary asset ${uploadResult.publicId}: ${err.message}`);
      });
    }
    throw dbError;
  }

  logger.info(`Successfully created and associated MediaAsset ${mediaAsset._id} with draft ${draft._id}`);
  return mediaAsset;
};

export default {
  synthesizeImagePrompt,
  generateImageFromOpenAI,
  generateAndSavePostImage
};

