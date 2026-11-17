/**
 * Image Generation Prompt Builder
 * Crafts detailed visual prompts for DALL-E / OpenAI Image API to generate LinkedIn graphics.
 */
export const buildImagePrompt = ({
  topic,
  postSummary,
  style = 'modern minimal editorial illustration',
  aspectRatio = 'square' // 'square' (1:1) or 'landscape' (16:9)
}) => {
  return {
    prompt: `A high-end ${style} representing "${topic}". Context: ${postSummary}. Professional graphic design, clean composition, cohesive color palette, suitable for a LinkedIn business publication header. No garbled text, no watermarks, high visual clarity.`,
    size: aspectRatio === 'landscape' ? '1792x1024' : '1024x1024'
  };
};

export default buildImagePrompt;

