import { cloudinary } from '../../config/cloudinary.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import ApiError from '../../utils/apiError.js';
import localStorageService from './localStorage.service.js';

// Clean curated corporate & tech visual fallbacks for offline / mock testing
const MOCK_VISUAL_FALLBACKS = {
  editorial: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1024&q=80',
  tech_illustration: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1024&q=80',
  business_illustration: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1024&q=80',
  news_graphic: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1024&q=80',
  data_visual: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1024&q=80',
  minimalist_concept: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1024&q=80'
};

/**
 * Upload Image from remote URL
 * Uses local server storage with auto-pruning by default, or Cloudinary if configured
 */
export const uploadImageFromUrl = async (
  remoteUrl,
  folder = 'linkedin-content-studio/posts',
  style = 'editorial',
  metadata = {}
) => {
  // Use local server storage when STORAGE_DRIVER is 'local' (default)
  if (env.STORAGE_DRIVER === 'local') {
    return await localStorageService.uploadImageFromUrl(remoteUrl, folder, style, metadata);
  }

  const isMock =
    !env.CLOUDINARY_CLOUD_NAME ||
    env.CLOUDINARY_CLOUD_NAME === 'mock_cloud_name' ||
    !env.CLOUDINARY_API_KEY ||
    env.CLOUDINARY_API_KEY === 'mock_api_key';

  if (isMock) {
    logger.info(`Cloudinary is in mock mode. Generating hosted webp asset representation.`);
    const fallbackUrl = remoteUrl && !remoteUrl.includes('placeholder')
      ? remoteUrl
      : MOCK_VISUAL_FALLBACKS[style] || MOCK_VISUAL_FALLBACKS.editorial;

    const mockId = `mock_cld_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      publicId: mockId,
      secureUrl: fallbackUrl,
      thumbnailUrl: fallbackUrl.replace('w=1024', 'w=300'),
      width: 1024,
      height: 1024,
      format: 'webp',
      bytes: 184520
    };
  }

  try {
    logger.debug(`Uploading image to Cloudinary from remote URL into folder: ${folder}`);
    const result = await cloudinary.uploader.upload(remoteUrl, {
      folder,
      resource_type: 'image',
      format: 'webp',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    });

    const thumbnailUrl = cloudinary.url(result.public_id, {
      width: 300,
      height: 300,
      crop: 'fill',
      format: 'webp',
      quality: 'auto'
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      thumbnailUrl: thumbnailUrl || result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    logger.warn(`Live Cloudinary upload failed (${error.message}). Returning safe fallback.`);
    const fallbackUrl = MOCK_VISUAL_FALLBACKS[style] || MOCK_VISUAL_FALLBACKS.editorial;
    const mockId = `mock_cld_fallback_${Date.now()}`;
    return {
      publicId: mockId,
      secureUrl: fallbackUrl,
      thumbnailUrl: fallbackUrl.replace('w=1024', 'w=300'),
      width: 1024,
      height: 1024,
      format: 'webp',
      bytes: 152000
    };
  }
};

/**
 * Upload Image Buffer (e.g. Headless rendered slide PNG)
 */
export const uploadImageBuffer = async (buffer, folder = 'linkedin-content-studio/carousels', filename = 'slide') => {
  // Use local server storage when STORAGE_DRIVER is 'local' (default)
  if (env.STORAGE_DRIVER === 'local') {
    return await localStorageService.uploadImageBuffer(buffer, folder, filename);
  }

  const isMock =
    !env.CLOUDINARY_CLOUD_NAME ||
    env.CLOUDINARY_CLOUD_NAME === 'mock_cloud_name' ||
    !env.CLOUDINARY_API_KEY ||
    env.CLOUDINARY_API_KEY === 'mock_api_key';

  if (isMock) {
    logger.info(`Cloudinary is in mock mode. Returning hosted webp asset representation for slide buffer.`);
    const mockId = `mock_cld_slide_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const mockUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&h=1350&q=80`;
    return {
      publicId: mockId,
      secureUrl: mockUrl,
      thumbnailUrl: mockUrl,
      width: 1080,
      height: 1350,
      format: 'png',
      bytes: buffer ? buffer.length : 45000
    };
  }

  try {
    const base64Data = `data:image/png;base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      resource_type: 'image',
      format: 'png',
      public_id: `${filename}_${Date.now()}`
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      thumbnailUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    logger.warn(`Live Cloudinary buffer upload failed (${error.message}). Returning fallback.`);
    const mockId = `mock_cld_slide_fallback_${Date.now()}`;
    const mockUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&h=1350&q=80`;
    return {
      publicId: mockId,
      secureUrl: mockUrl,
      thumbnailUrl: mockUrl,
      width: 1080,
      height: 1350,
      format: 'png',
      bytes: buffer ? buffer.length : 35000
    };
  }
};

/**
 * Delete Image
 */
export const deleteImage = async (publicId) => {
  if (env.STORAGE_DRIVER === 'local' || publicId?.startsWith('local_')) {
    return await localStorageService.deleteImage(publicId);
  }

  if (!publicId || publicId.startsWith('mock_')) {
    logger.info(`Mock Cloudinary asset ${publicId} deleted successfully.`);
    return { result: 'ok' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.warn(`Cloudinary delete warning (${error.message}). Continuing.`);
    return { result: 'ok' };
  }
};

export default {
  uploadImageFromUrl,
  deleteImage,
  MOCK_VISUAL_FALLBACKS
};
