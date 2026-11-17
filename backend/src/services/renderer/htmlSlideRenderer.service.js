import puppeteer from 'puppeteer-core';
import { ZipArchive } from 'archiver';
import { Readable } from 'stream';
import { uploadImageBuffer } from '../storage/cloudinary.service.js';
import { THEME_DEFINITIONS } from '../../prompts/carouselGeneration.prompt.js';
import logger from '../../utils/logger.js';
import fs from 'fs';

// Known standard browser binary locations on Windows / Linux / macOS
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
].filter(Boolean);

/**
 * Finds an available browser binary
 */
export const getBrowserExecutablePath = () => {
  for (const path of CHROME_PATHS) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
};

/**
 * Generates self-contained, responsive HTML/CSS for a single carousel slide
 */
export const buildSlideHtml = (slide, carousel, author = {}) => {
  const theme = THEME_DEFINITIONS[carousel.theme] || THEME_DEFINITIONS.modern_navy;
  const slideNum = slide.slideNumber || 1;
  const totalSlides = carousel.slideCount || (carousel.slides && carousel.slides.length) || 6;
  const progressPct = Math.round((slideNum / totalSlides) * 100);

  const authorName = author.name || carousel.author?.name || 'Thought Leader';
  const authorHeadline = author.headline || carousel.author?.headline || 'Tech Strategist & Operator';
  const authorHandle = author.handle || carousel.author?.handle || `@${authorName.toLowerCase().replace(/\s+/g, '')}`;
  const initial = authorName.charAt(0).toUpperCase();

  const isHookSlide = slide.slideType === 'hook_intro' || slideNum === 1;
  const isCtaSlide = slide.slideType === 'closing_cta' || slideNum === totalSlides;
  const isTakeawaySlide = slide.slideType === 'key_takeaway' || slideNum === totalSlides - 1;

  const width = carousel.dimensions?.width || 1080;
  const height = carousel.dimensions?.height || 1350;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Slide ${slideNum} - ${carousel.title || 'LinkedIn Carousel'}</title>
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }
  body {
    width: ${width}px;
    height: ${height}px;
    background: ${theme.bg};
    color: ${theme.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    position: relative;
  }
  
  /* Top Progress Line */
  .progress-bar-bg {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    position: absolute;
    top: 0;
    left: 0;
  }
  .progress-bar-fill {
    height: 100%;
    width: ${progressPct}%;
    background: ${theme.accent};
    border-radius: 0 4px 4px 0;
  }

  /* Padding wrapper */
  .slide-container {
    padding: 65px 75px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 10;
  }

  /* Header */
  .slide-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 25px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    background: ${theme.cardBg};
    color: ${theme.accent};
    border: 1.5px solid ${theme.accent}40;
  }
  .slide-counter {
    font-size: 18px;
    font-weight: 700;
    color: ${theme.secondary};
    letter-spacing: 1px;
    font-variant-numeric: tabular-nums;
  }

  /* Main Body Content */
  .slide-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
    margin: 15px 0;
  }

  /* Typography */
  .hook-title {
    font-size: 56px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: ${theme.text};
  }
  .point-title {
    font-size: 44px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.015em;
    color: ${theme.text};
  }
  .subheading {
    font-size: 26px;
    font-weight: 600;
    line-height: 1.35;
    color: ${theme.accent};
  }
  .body-text {
    font-size: 24px;
    font-weight: 400;
    line-height: 1.55;
    color: ${theme.text}dd;
  }

  /* Cards & Lists */
  .info-card {
    background: ${theme.cardBg};
    border: 1.5px solid ${theme.accent}30;
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }
  .bullet-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 10px;
  }
  .bullet-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    font-size: 22px;
    font-weight: 500;
    line-height: 1.45;
    color: ${theme.text};
  }
  .bullet-bullet {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: ${theme.accent}25;
    color: ${theme.accent};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* Stat Callout */
  .stat-block {
    display: flex;
    align-items: baseline;
    gap: 16px;
    background: ${theme.accent}15;
    border-left: 5px solid ${theme.accent};
    padding: 16px 24px;
    border-radius: 0 14px 14px 0;
  }
  .stat-value {
    font-size: 52px;
    font-weight: 900;
    color: ${theme.accent};
    line-height: 1;
  }
  .stat-label {
    font-size: 20px;
    font-weight: 600;
    color: ${theme.secondary};
  }

  /* Footer */
  .slide-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 1.5px solid rgba(255, 255, 255, 0.08);
  }
  .author-block {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .author-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: ${theme.accent};
    color: ${theme.bg};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 800;
    box-shadow: 0 4px 12px ${theme.accent}40;
  }
  .author-info {
    display: flex;
    flex-direction: column;
  }
  .author-name {
    font-size: 17px;
    font-weight: 700;
    color: ${theme.text};
  }
  .author-sub {
    font-size: 14px;
    font-weight: 500;
    color: ${theme.secondary};
  }
  .swipe-prompt {
    font-size: 16px;
    font-weight: 800;
    color: ${theme.accent};
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="progress-bar-bg">
    <div class="progress-bar-fill"></div>
  </div>

  <div class="slide-container">
    <!-- Header -->
    <div class="slide-header">
      <div class="badge">
        <span>⚡</span>
        <span>${slide.categoryBadge || 'INSIGHT'}</span>
      </div>
      <div class="slide-counter">${String(slideNum).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</div>
    </div>

    <!-- Slide Body -->
    <div class="slide-body">
      ${
        isHookSlide
          ? `
        <div style="margin-bottom: 8px;">
          <h1 class="hook-title">${slide.heading}</h1>
        </div>
        ${slide.subheading ? `<p class="subheading">${slide.subheading}</p>` : ''}
        
        <div class="info-card" style="margin-top: 15px;">
          <p class="body-text">${slide.bodyText || 'Swipe through for the strategic breakdown and key industry implications.'}</p>
          <div style="margin-top: 20px; display: flex; align-items: center; gap: 12px; font-weight: 700; color: ${theme.accent}; font-size: 18px;">
            <span>👉</span>
            <span>Swipe for the 3-minute executive summary</span>
          </div>
        </div>
      `
          : isCtaSlide
          ? `
        <div style="text-align: center; margin-bottom: 10px;">
          <h2 class="point-title">${slide.heading}</h2>
        </div>
        
        <div class="info-card" style="text-align: center; padding: 40px 30px;">
          <p class="subheading" style="margin-bottom: 16px;">${slide.subheading || 'What is your perspective on this?'}</p>
          <p class="body-text" style="margin-bottom: 24px;">${slide.bodyText || 'Leave a comment below with your thoughts and experience.'}</p>
          
          <div style="display: inline-flex; align-items: center; gap: 10px; padding: 14px 28px; border-radius: 9999px; background: ${theme.accent}; color: ${theme.bg}; font-weight: 800; font-size: 18px;">
            <span>💬</span>
            <span>Join the Discussion Below</span>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 16px; font-weight: 600; color: ${theme.secondary};">
            Follow <strong style="color: ${theme.text};">${authorName}</strong> for more strategic insights
          </div>
          <div style="font-size: 15px; font-weight: 800; color: ${theme.accent};">
            + FOLLOW 🔔
          </div>
        </div>
      `
          : isTakeawaySlide
          ? `
        <div style="margin-bottom: 6px;">
          <div style="font-size: 16px; font-weight: 800; color: ${theme.accent}; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
            KEY TAKEAWAY & BOTTOM LINE
          </div>
          <h2 class="point-title">${slide.heading}</h2>
        </div>

        ${slide.subheading ? `<p class="subheading">${slide.subheading}</p>` : ''}

        <div class="info-card">
          <p class="body-text" style="font-weight: 500; margin-bottom: 15px;">${slide.bodyText}</p>
          ${
            slide.bulletPoints && slide.bulletPoints.length > 0
              ? `
            <ul class="bullet-list">
              ${slide.bulletPoints
                .map(
                  (b) => `
                <li class="bullet-item">
                  <div class="bullet-bullet">✓</div>
                  <div>${b}</div>
                </li>
              `
                )
                .join('')}
            </ul>
          `
              : ''
          }
        </div>
      `
          : `
        <!-- Content Point Slide -->
        <div style="margin-bottom: 4px;">
          <div style="font-size: 15px; font-weight: 800; color: ${theme.secondary}; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
            INSIGHT #${slideNum - 1}
          </div>
          <h2 class="point-title">${slide.heading}</h2>
        </div>

        ${slide.subheading ? `<p class="subheading">${slide.subheading}</p>` : ''}

        ${
          slide.statCallout && slide.statCallout.value
            ? `
          <div class="stat-block">
            <span class="stat-value">${slide.statCallout.value}</span>
            <span class="stat-label">${slide.statCallout.label || ''}</span>
          </div>
        `
            : ''
        }

        <p class="body-text">${slide.bodyText || ''}</p>

        ${
          slide.bulletPoints && slide.bulletPoints.length > 0
            ? `
          <div class="info-card">
            <ul class="bullet-list">
              ${slide.bulletPoints
                .map(
                  (b, idx) => `
                <li class="bullet-item">
                  <div class="bullet-bullet">${idx + 1}</div>
                  <div>${b}</div>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>
        `
            : ''
        }
      `
      }
    </div>

    <!-- Footer -->
    <div class="slide-footer">
      <div class="author-block">
        <div class="author-avatar">${initial}</div>
        <div class="author-info">
          <span class="author-name">${authorName}</span>
          <span class="author-sub">${authorHeadline}</span>
        </div>
      </div>
      <div class="swipe-prompt">
        ${isCtaSlide ? 'SAVE & SHARE 🔖' : 'SWIPE ➔'}
      </div>
    </div>
  </div>
</body>
</html>`;
};

// Valid minimal PNG binary fallback buffer (neutral dark slate #0f172a, never green)
const FALLBACK_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==';

export const getFallbackPngBuffer = () => Buffer.from(FALLBACK_PNG_BASE64, 'base64');

/**
 * Renders an HTML string into a high-quality PNG Buffer using headless Chrome
 * Optionally accepts a pre-existing browser instance to reuse across multiple slides
 */
export const renderSlideBuffer = async (
  html,
  dimensions = { width: 1080, height: 1350 },
  existingBrowser = null
) => {
  const executablePath = getBrowserExecutablePath();

  if (!executablePath && !existingBrowser) {
    logger.warn('No local Chrome/Edge browser found. Generating valid PNG fallback buffer.');
    return getFallbackPngBuffer();
  }

  let browser = existingBrowser;
  let shouldCloseBrowser = false;

  try {
    if (!browser) {
      browser = await puppeteer.launch({
        executablePath,
        args: ['--no-sandbox', '--disable-gpu', '--headless=new', '--hide-scrollbars'],
        headless: true
      });
      shouldCloseBrowser = true;
    }

    const page = await browser.newPage();
    try {
      await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
        deviceScaleFactor: 2 // High DPI retina rendering
      });

      await page.setContent(html, { waitUntil: 'load' });
      const buffer = await page.screenshot({
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: dimensions.width,
          height: dimensions.height
        }
      });

      return buffer;
    } finally {
      await page.close().catch(() => {});
    }
  } catch (error) {
    logger.error(`Puppeteer slide render error: ${error.message}`);
    return getFallbackPngBuffer();
  } finally {
    if (browser && shouldCloseBrowser) {
      await browser.close().catch(() => {});
    }
  }
};

/**
 * Renders all slides in a Carousel and uploads to Cloudinary
 * Reuses a single shared browser instance for optimal performance
 */
export const renderCarouselSlides = async (carousel, author = {}) => {
  logger.info(`Rendering ${carousel.slides.length} slides for carousel "${carousel.title}" (ID: ${carousel._id})`);

  const executablePath = getBrowserExecutablePath();
  let sharedBrowser = null;

  if (executablePath) {
    try {
      sharedBrowser = await puppeteer.launch({
        executablePath,
        args: ['--no-sandbox', '--disable-gpu', '--headless=new', '--hide-scrollbars'],
        headless: true
      });
    } catch (err) {
      logger.warn(`Could not launch shared Puppeteer browser (${err.message}). Falling back to per-slide render.`);
    }
  }

  try {
    for (let i = 0; i < carousel.slides.length; i++) {
      const slide = carousel.slides[i];
      const html = buildSlideHtml(slide, carousel, author);
      const buffer = await renderSlideBuffer(html, carousel.dimensions, sharedBrowser);

      // Upload to Cloudinary
      const uploadRes = await uploadImageBuffer(
        buffer,
        `linkedin-content-studio/carousels/${carousel._id}`,
        `slide_${String(slide.slideNumber).padStart(2, '0')}`
      );

      slide.renderedImageUrl = uploadRes.secureUrl;
      slide.renderedImagePublicId = uploadRes.publicId;
    }
  } finally {
    if (sharedBrowser) {
      await sharedBrowser.close().catch(() => {});
    }
  }

  carousel.isRendered = true;
  carousel.renderedAt = new Date();
  carousel.status = 'rendered';

  await carousel.save();
  return carousel;
};

/**
 * Creates a ZIP archive of all rendered slide PNGs
 * Reuses a single shared browser instance
 */
export const createCarouselZipStream = async (carousel, author = {}) => {
  const archive = new ZipArchive({ zlib: { level: 9 } });

  const executablePath = getBrowserExecutablePath();
  let sharedBrowser = null;

  if (executablePath) {
    try {
      sharedBrowser = await puppeteer.launch({
        executablePath,
        args: ['--no-sandbox', '--disable-gpu', '--headless=new', '--hide-scrollbars'],
        headless: true
      });
    } catch (err) {
      logger.warn(`Could not launch shared browser for ZIP export (${err.message}).`);
    }
  }

  try {
    // Render each slide buffer directly or stream existing
    for (const slide of carousel.slides) {
      const html = buildSlideHtml(slide, carousel, author);
      const buffer = await renderSlideBuffer(html, carousel.dimensions, sharedBrowser);
      const filename = `slide-${String(slide.slideNumber).padStart(2, '0')}.png`;
      archive.append(buffer, { name: filename });
    }
  } finally {
    if (sharedBrowser) {
      await sharedBrowser.close().catch(() => {});
    }
  }

  // Include a helpful LinkedIn publishing instruction README
  const readme = `LinkedIn Carousel Package: ${carousel.title}
Theme: ${carousel.theme}
Total Slides: ${carousel.slides.length}
Dimensions: ${carousel.dimensions?.width}x${carousel.dimensions?.height} (4:5 Portrait)

PUBLISHING TIPS FOR LINKEDIN:
1. Go to LinkedIn -> Start a post -> Add a document (Document icon).
2. For multiple PNG images, you can convert them to a PDF or upload them directly.
3. Use a compelling caption matching Slide 1's hook.
4. Add 3-5 relevant industry hashtags.
`;
  archive.append(readme, { name: 'README.txt' });

  archive.finalize();
  return archive;
};
