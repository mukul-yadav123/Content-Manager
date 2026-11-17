import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';
import logger from '../utils/logger.js';

let isCloudinaryConfigured = false;

export const initCloudinary = () => {
  try {
    if (
      env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_CLOUD_NAME !== 'mock_cloud_name' &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_KEY !== 'mock_api_key'
    ) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true
      });
      isCloudinaryConfigured = true;
      logger.info(`Cloudinary configured for cloud: ${env.CLOUDINARY_CLOUD_NAME}`);
    } else {
      isCloudinaryConfigured = false;
      logger.info('Cloudinary configured in mock/development mode (placeholder credentials).');
    }
    return cloudinary;
  } catch (error) {
    logger.warn(`Cloudinary configuration warning: ${error.message}`);
    isCloudinaryConfigured = false;
    return cloudinary;
  }
};

export const getCloudinaryStatus = () => {
  return {
    isConfigured: isCloudinaryConfigured,
    cloudName: isCloudinaryConfigured ? env.CLOUDINARY_CLOUD_NAME : 'mock/unconfigured'
  };
};

export { cloudinary };
export default { cloudinary, initCloudinary, getCloudinaryStatus };

