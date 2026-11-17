import OpenAI from 'openai';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import ApiError from '../../utils/apiError.js';

let openaiClient = null;

export const getOpenAIClient = () => {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'mock-key-replace-with-real-key') {
      logger.warn('OpenAI initialized with placeholder key. Live API calls will fail or return mock responses.');
    }
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
  }
  return openaiClient;
};

/**
 * Reusable Chat Completion Utility
 */
export const generateText = async ({
  systemPrompt,
  userPrompt,
  model = env.OPENAI_MODEL,
  temperature = 0.7,
  responseFormat = 'text' // 'text' | 'json_object'
}) => {
  try {
    const client = getOpenAIClient();

    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: userPrompt }
    ];

    const params = {
      model,
      messages,
      temperature,
      ...(responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {})
    };

    logger.debug(`Calling OpenAI generateText with model: ${model}`);
    const completion = await client.chat.completions.create(params);

    const content = completion.choices?.[0]?.message?.content || '';
    return {
      content,
      usage: completion.usage,
      model: completion.model
    };
  } catch (error) {
    logger.error(`OpenAI generateText error: ${error.message}`);
    throw ApiError.internal(`AI Text Generation Failed: ${error.message}`);
  }
};

/**
 * Reusable Image Generation Utility (DALL-E)
 */
export const generateImage = async ({
  prompt,
  model = env.OPENAI_IMAGE_MODEL,
  size = '1024x1024',
  quality = 'standard'
}) => {
  try {
    const client = getOpenAIClient();
    logger.debug(`Calling OpenAI generateImage with model: ${model}`);

    const response = await client.images.generate({
      model,
      prompt,
      n: 1,
      size,
      quality
    });

    const imageUrl = response.data?.[0]?.url;
    const revisedPrompt = response.data?.[0]?.revised_prompt;

    return {
      imageUrl,
      revisedPrompt
    };
  } catch (error) {
    logger.error(`OpenAI generateImage error: ${error.message}`);
    throw ApiError.internal(`AI Image Generation Failed: ${error.message}`);
  }
};

export default {
  getOpenAIClient,
  generateText,
  generateImage
};

