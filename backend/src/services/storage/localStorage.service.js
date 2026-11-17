import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory: backend/uploads
const UPLOADS_ROOT = path.resolve(__dirname, '../../../uploads');
const IMAGES_DIR = path.join(UPLOADS_ROOT, 'images');
const CAROUSELS_DIR = path.join(UPLOADS_ROOT, 'carousels');

// Minimal valid PNG binary buffer for mock fallbacks (neutral dark slate #0f172a, never green)
const FALLBACK_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Ensure storage directories exist on server startup
 */
export const initLocalStorage = () => {
  try {
    if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
    if (!fs.existsSync(CAROUSELS_DIR)) fs.mkdirSync(CAROUSELS_DIR, { recursive: true });
    logger.info(`Local storage initialized at: ${UPLOADS_ROOT}`);
  } catch (error) {
    logger.error(`Failed to initialize local storage directories: ${error.message}`);
  }
};

/**
 * Generate fully qualified public URL for a locally stored asset
 */
const getAssetUrl = (subfolder, filename) => {
  const baseUrl = (env.SERVER_URL || `http://localhost:${env.PORT}`).replace(/\/+$/, '');
  return `${baseUrl}/uploads/${subfolder}/${filename}`;
};

/**
 * Save an image buffer (e.g. from Puppeteer headless Chrome) to local storage
 */
export const uploadImageBuffer = async (
  buffer,
  folder = 'carousels',
  filenamePrefix = 'slide'
) => {
  initLocalStorage();

  const subfolder = folder.includes('carousel') ? 'carousels' : 'images';
  const targetDir = subfolder === 'carousels' ? CAROUSELS_DIR : IMAGES_DIR;

  const randomHash = crypto.randomBytes(4).toString('hex');
  const safePrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safePrefix}_${Date.now()}_${randomHash}.png`;
  const filePath = path.join(targetDir, filename);

  const dataBuffer = buffer && Buffer.isBuffer(buffer) ? buffer : FALLBACK_PNG_BUFFER;

  try {
    fs.writeFileSync(filePath, dataBuffer);
  } catch (writeErr) {
    logger.error(`Failed to write local image buffer: ${writeErr.message}`);
  }

  const publicId = `local_${subfolder}_${filename}`;
  const assetUrl = getAssetUrl(subfolder, filename);

  return {
    publicId,
    secureUrl: assetUrl,
    thumbnailUrl: assetUrl,
    width: 1080,
    height: 1350,
    format: 'png',
    bytes: dataBuffer.length,
    localPath: filePath
  };
};

/**
 * Save an image from a remote URL (e.g. OpenAI temporary DALL-E 3 URL) to local storage
 */
export const uploadImageFromUrl = async (
  remoteUrl,
  folder = 'images',
  style = 'editorial'
) => {
  initLocalStorage();

  const subfolder = folder.includes('carousel') ? 'carousels' : 'images';
  const targetDir = subfolder === 'carousels' ? CAROUSELS_DIR : IMAGES_DIR;

  const randomHash = crypto.randomBytes(4).toString('hex');
  const filename = `post_${style}_${Date.now()}_${randomHash}.png`;
  const filePath = path.join(targetDir, filename);

  let imageBuffer = FALLBACK_PNG_BUFFER;

  if (remoteUrl && typeof remoteUrl === 'string' && !remoteUrl.includes('mock') && !remoteUrl.includes('placeholder')) {
    try {
      if (remoteUrl.startsWith('data:image/')) {
        const base64Data = remoteUrl.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        logger.info(`Downloading generated image from temporary URL: ${remoteUrl.substring(0, 60)}...`);
        const response = await fetch(remoteUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(30000)
        });
        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuf);
        } else {
          logger.warn(`Could not fetch remote image URL (HTTP ${response.status} ${response.statusText}). Writing local fallback placeholder.`);
        }
      }
    } catch (fetchErr) {
      logger.warn(`Could not fetch remote image URL (${fetchErr.message}). Writing local fallback placeholder.`);
    }
  }

  try {
    fs.writeFileSync(filePath, imageBuffer);
  } catch (writeErr) {
    logger.error(`Failed to write downloaded image: ${writeErr.message}`);
  }

  const publicId = `local_${subfolder}_${filename}`;
  const assetUrl = getAssetUrl(subfolder, filename);

  return {
    publicId,
    secureUrl: assetUrl,
    thumbnailUrl: assetUrl,
    width: 1024,
    height: 1024,
    format: 'webp',
    bytes: imageBuffer.length,
    localPath: filePath
  };
};

/**
 * Delete a local image by public ID
 */
export const deleteImage = async (publicId) => {
  if (!publicId || typeof publicId !== 'string') {
    return { result: 'ok' };
  }

  // Parse public ID (e.g. "local_images_post_editorial_123.png")
  if (publicId.startsWith('local_')) {
    const parts = publicId.replace(/^local_/, '').split('_');
    const subfolder = parts[0] === 'carousels' ? 'carousels' : 'images';
    const filename = publicId.replace(`local_${subfolder}_`, '');
    const targetDir = subfolder === 'carousels' ? CAROUSELS_DIR : IMAGES_DIR;
    const filePath = path.join(targetDir, filename);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted local storage file: ${filePath}`);
      }
    } catch (delErr) {
      logger.warn(`Could not delete local file ${filePath}: ${delErr.message}`);
    }
  }

  return { result: 'ok' };
};

/**
 * Auto-prune temporary uploaded files older than maxAgeHours (default: 48 hours)
 */
export const pruneOldUploads = (maxAgeHours = 48) => {
  try {
    initLocalStorage();
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let prunedCount = 0;

    [IMAGES_DIR, CAROUSELS_DIR].forEach((dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile() && stats.mtimeMs < cutoffTime) {
            fs.unlinkSync(filePath);
            prunedCount++;
          }
        } catch {
          // Skip file if inaccessible
        }
      });
    });

    if (prunedCount > 0) {
      logger.info(`Auto-pruned ${prunedCount} temporary images older than ${maxAgeHours} hours.`);
    }
    return prunedCount;
  } catch (error) {
    logger.warn(`Error during upload auto-prune: ${error.message}`);
    return 0;
  }
};

export default {
  initLocalStorage,
  uploadImageBuffer,
  uploadImageFromUrl,
  deleteImage,
  pruneOldUploads
};
