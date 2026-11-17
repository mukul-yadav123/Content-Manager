import { cloudinary } from '../../config/cloudinary.js';
import logger from '../../utils/logger.js';
import ApiError from '../../utils/apiError.js';

/**
 * Reusable Cloudinary Upload Service
 */
export const uploadImageFromUrl = async (remoteUrl, folder = 'linkedin-content-studio') => {
  try {
    logger.debug(`Uploading image to Cloudinary from remote URL into folder: ${folder}`);
    const result = await cloudinary.uploader.upload(remoteUrl, {
      folder,
      resource_type: 'image',
      format: 'webp',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    logger.error(`Cloudinary upload error: ${error.message}`);
    throw ApiError.internal(`Cloudinary Image Upload Failed: ${error.message}`);
  }
};

/**
 * Delete Image from Cloudinary
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
    throw ApiError.internal(`Failed to delete media asset: ${error.message}`);
  }
};

export default {
  uploadImageFromUrl,
  deleteImage
};

