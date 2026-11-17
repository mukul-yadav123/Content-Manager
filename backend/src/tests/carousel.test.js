import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Topic } from '../models/Topic.js';
import { NewsArticle } from '../models/NewsArticle.js';
import ContentDraft from '../models/ContentDraft.js';
import Carousel from '../models/Carousel.js';
import {
  buildCarouselOutlinePrompt,
  buildRegenerateSlidePrompt,
  THEME_DEFINITIONS
} from '../prompts/carouselGeneration.prompt.js';
import {
  buildSlideHtml,
  renderSlideBuffer,
  getBrowserExecutablePath,
  renderCarouselSlides
} from '../services/renderer/htmlSlideRenderer.service.js';
import { uploadImageBuffer } from '../services/storage/cloudinary.service.js';

let mongod;

const runCarouselTests = async () => {
  console.log('====================================================');
  console.log('      STARTING AI LINKEDIN CAROUSEL TESTS          ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, name) => {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  };

  try {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await User.init();
    await Topic.init();
    await NewsArticle.init();
    await ContentDraft.init();
    await Carousel.init();

    // -------------------------------------------------------------
    // Test Group 1: Themes & Prompt Builders
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Themes & Prompt Builders ---');

    const themeKeys = Object.keys(THEME_DEFINITIONS);
    assert(themeKeys.length === 6, 'All 6 distinct professional carousel themes defined');
    assert(THEME_DEFINITIONS.modern_navy.bg === '#0A1128', 'Modern Navy theme has valid dark background');
    assert(THEME_DEFINITIONS.minimal_light.bg === '#F8FAFC', 'Minimal Light theme has valid light background');

    const promptObj6 = buildCarouselOutlinePrompt({
      postTitle: 'Autonomous Enterprise AI Systems',
      postHook: '90% of AI pilots fail. Here is why.',
      slideCount: 6
    });
    assert(promptObj6.systemPrompt.includes('EXACTLY 6 slides'), 'Enforces 6-slide count in system prompt');

    const promptObj5 = buildCarouselOutlinePrompt({
      postTitle: 'Market Shift',
      slideCount: 4 // Below min -> clamped to 5
    });
    assert(promptObj5.systemPrompt.includes('EXACTLY 5 slides'), 'Clamps lower bound slide count to 5');

    const promptObj7 = buildCarouselOutlinePrompt({
      postTitle: 'Market Shift',
      slideCount: 10 // Above max -> clamped to 7
    });
    assert(promptObj7.systemPrompt.includes('EXACTLY 7 slides'), 'Clamps upper bound slide count to 7');

    // -------------------------------------------------------------
    // Test Group 2: HTML/CSS Slide Template Builder
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: HTML/CSS Slide Template Builder ---');

    const mockCarousel = {
      title: 'Architecting Scalable AI Workflows',
      theme: 'modern_navy',
      slideCount: 6,
      dimensions: { width: 1080, height: 1350 },
      author: { name: 'Elena Rostova', headline: 'VP of AI Systems', handle: '@elena_ai' }
    };

    const hookSlide = {
      slideNumber: 1,
      slideType: 'hook_intro',
      categoryBadge: 'AI ARCHITECTURE',
      heading: 'The Fallacy of Giant Models',
      subheading: 'Why small, specialized models are winning enterprise production.',
      bodyText: 'Swipe for the architectural reality.'
    };

    const html1 = buildSlideHtml(hookSlide, mockCarousel, mockCarousel.author);
    assert(html1.includes('<!DOCTYPE html>'), 'Slide 1 generates full HTML document');
    assert(html1.includes('The Fallacy of Giant Models'), 'Slide 1 includes hook title');
    assert(html1.includes('01 / 06'), 'Slide 1 includes slide counter');
    assert(html1.includes('Elena Rostova'), 'Slide 1 includes author name');
    assert(html1.includes('width: 1080px;'), 'Slide 1 has 1080px width styling');
    assert(html1.includes('height: 1350px;'), 'Slide 1 has 1350px height styling');

    const contentSlide = {
      slideNumber: 2,
      slideType: 'content_point',
      categoryBadge: 'INFERENCE ECONOMICS',
      heading: 'Inference Costs Rule the World',
      subheading: 'Training is a capital expenditure. Inference is a recurring margin.',
      bodyText: 'When serving millions of requests, latency and token economics determine survivability.',
      bulletPoints: ['40% lower thermal dissipation', 'Zero cold-start penalty'],
      statCallout: { value: '3.8x', label: 'Lower token cost' }
    };

    const html2 = buildSlideHtml(contentSlide, mockCarousel, mockCarousel.author);
    assert(html2.includes('3.8x'), 'Content slide renders stat callout value');
    assert(html2.includes('Zero cold-start penalty'), 'Content slide renders bullet points');
    assert(html2.includes('02 / 06'), 'Content slide renders slide counter 02 / 06');

    // -------------------------------------------------------------
    // Test Group 3: Headless Chrome Slide PNG Renderer
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Headless Chrome Slide PNG Renderer ---');

    const browserPath = getBrowserExecutablePath();
    assert(Boolean(browserPath), `Found local browser binary at "${browserPath}"`);

    const pngBuffer = await renderSlideBuffer(html1, { width: 1080, height: 1350 });
    assert(Buffer.isBuffer(pngBuffer) && pngBuffer.length > 5000, `Renders valid slide PNG buffer (${pngBuffer.length} bytes)`);
    // Check PNG signature: 89 50 4E 47
    const isPng = pngBuffer[0] === 0x89 && pngBuffer[1] === 0x50 && pngBuffer[2] === 0x4e && pngBuffer[3] === 0x47;
    assert(isPng, 'Rendered buffer contains authentic PNG signature header');

    // Test Cloudinary Buffer upload
    const uploadRes = await uploadImageBuffer(pngBuffer, 'test/carousels', 'slide_01');
    assert(uploadRes.publicId && uploadRes.publicId.length > 5, 'Uploads slide buffer and returns publicId');
    assert(uploadRes.secureUrl.startsWith('https://'), 'Uploads slide buffer and returns HTTPS secureUrl');

    // -------------------------------------------------------------
    // Test Group 4: Carousel API Lifecycle & Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: Carousel API Lifecycle & Endpoints ---');

    // Register User A
    const userARes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'creator_a@company.com',
        password: 'Password123!',
        name: 'Alex Creator',
        headline: 'Staff AI Engineer'
      });
    const tokenA = userARes.body.data.token;
    const userAId = userARes.body.data.user._id || userARes.body.data.user.id;

    // Register User B
    const userBRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'creator_b@company.com',
        password: 'Password123!',
        name: 'Jordan Peer',
        headline: 'Product Lead'
      });
    const tokenB = userBRes.body.data.token;
    const userBId = userBRes.body.data.user._id || userBRes.body.data.user.id;

    // Create Topic & Article & Draft for User A
    const topic = await Topic.create({
      userId: userAId,
      name: 'Agentic Workflows',
      category: 'Artificial Intelligence',
      keywords: ['AI agents', 'LLMs', 'orchestration']
    });

    const article = await NewsArticle.create({
      userId: userAId,
      topicId: topic._id,
      title: 'State of Autonomous Systems in Enterprise 2026',
      sourceUrl: 'https://techherald.com/enterprise-ai-2026',
      normalizedUrl: 'https://techherald.com/enterprise-ai-2026',
      publisher: 'Tech Herald',
      summary: 'Report reveals enterprise shift toward specialized domain agent clusters.',
      publishedAt: new Date(),
      status: 'shortlisted'
    });

    const draft = await ContentDraft.create({
      userId: userAId,
      topicId: topic._id,
      newsArticleId: article._id,
      title: 'Why Specialized Agents Beat Monolithic Models',
      hook: 'Most enterprise AI initiatives fail at the orchestration layer.',
      body: 'Building autonomous workflows requires domain guardrails, not just larger context windows.',
      cta: 'How is your team structuring your internal agent pipelines?'
    });

    // 4.1 Generate Carousel (POST /api/carousels/generate)
    const genRes = await request(app)
      .post('/api/carousels/generate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId: draft._id.toString(),
        slideCount: 6,
        theme: 'modern_navy',
        aspectRatio: '4:5'
      });

    assert(genRes.status === 201, 'POST /api/carousels/generate returns HTTP 201');
    const carouselData = genRes.body.data;
    assert(carouselData._id, 'Returns created carousel ID');
    assert(carouselData.slides.length === 6, 'Generates exactly 6 slides');
    assert(carouselData.slides[0].slideType === 'hook_intro', 'Slide 1 is hook_intro');
    assert(carouselData.slides[5].slideType === 'closing_cta', 'Slide 6 is closing_cta');
    assert(carouselData.slides[4].slideType === 'key_takeaway', 'Slide 5 is key_takeaway');
    assert(carouselData.theme === 'modern_navy', 'Preserves chosen theme');
    assert(carouselData.aspectRatio === '4:5', 'Preserves 4:5 aspect ratio');

    const carouselId = carouselData._id;

    // Verify draft reference is updated
    const updatedDraft = await ContentDraft.findById(draft._id);
    assert(updatedDraft.carouselId.toString() === carouselId, 'Updates draft.carouselId');
    assert(updatedDraft.carouselSlides.length === 6, 'Syncs draft.carouselSlides');

    // 4.2 Get Carousel by ID (GET /api/carousels/:id)
    const getRes = await request(app)
      .get(`/api/carousels/${carouselId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(getRes.status === 200, 'GET /api/carousels/:id returns HTTP 200');
    assert(getRes.body.data.title === carouselData.title, 'Returns matching carousel title');

    // 4.3 Get Carousels by Draft (GET /api/carousels/drafts/:draftId)
    const getDraftCarousels = await request(app)
      .get(`/api/carousels/drafts/${draft._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(getDraftCarousels.status === 200, 'GET /api/carousels/drafts/:draftId returns HTTP 200');
    assert(getDraftCarousels.body.data.length >= 1, 'Returns carousels for the draft');

    // 4.4 User B cannot access User A's carousel
    const unauthGet = await request(app)
      .get(`/api/carousels/${carouselId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    assert(unauthGet.status === 404, 'Prevents User B from accessing User A carousel (404)');

    // 4.5 Update Carousel Details & Theme (PUT /api/carousels/:id)
    const updateRes = await request(app)
      .put(`/api/carousels/${carouselId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        theme: 'minimal_light',
        title: 'Updated Strategic AI Playbook'
      });

    assert(updateRes.status === 200, 'PUT /api/carousels/:id returns HTTP 200');
    assert(updateRes.body.data.theme === 'minimal_light', 'Theme updated to minimal_light');
    assert(updateRes.body.data.title === 'Updated Strategic AI Playbook', 'Title updated successfully');

    // 4.6 Update Single Slide Content (PATCH /api/carousels/:id/slides/:slideIndex)
    const patchSlideRes = await request(app)
      .patch(`/api/carousels/${carouselId}/slides/1`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        heading: 'Handcrafted Custom Heading for Slide 2',
        subheading: 'Precision engineered subtitle',
        bodyText: 'Updated body text with verified industry metrics.',
        bulletPoints: ['Custom metric A', 'Custom metric B']
      });

    assert(patchSlideRes.status === 200, 'PATCH /api/carousels/:id/slides/:slideIndex returns HTTP 200');
    assert(patchSlideRes.body.data.slides[1].heading === 'Handcrafted Custom Heading for Slide 2', 'Slide heading successfully updated');
    assert(patchSlideRes.body.data.slides[1].bulletPoints.length === 2, 'Slide bullet points updated');

    // 4.7 Regenerate Single Slide with AI (POST /api/carousels/:id/slides/:slideIndex/regenerate)
    const regenSlideRes = await request(app)
      .post(`/api/carousels/${carouselId}/slides/1/regenerate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        instructions: 'Make it punchier for an executive audience'
      });

    assert(regenSlideRes.status === 200, 'POST /api/carousels/:id/slides/:slideIndex/regenerate returns HTTP 200');
    assert(regenSlideRes.body.data.slide.heading.includes('Refined') || regenSlideRes.body.data.slide.heading.length > 5, 'Regenerated slide contains refined content');

    // 4.8 Render All Slides to High-Quality PNGs (POST /api/carousels/:id/render)
    const renderRes = await request(app)
      .post(`/api/carousels/${carouselId}/render`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(renderRes.status === 200, 'POST /api/carousels/:id/render returns HTTP 200');
    assert(renderRes.body.data.isRendered === true, 'Marks carousel as isRendered: true');
    assert(renderRes.body.data.status === 'rendered', 'Updates carousel status to "rendered"');
    assert(renderRes.body.data.slides[0].renderedImageUrl.startsWith('https://'), 'Slide 1 receives Cloudinary secureUrl');
    assert(renderRes.body.data.slides[5].renderedImageUrl.startsWith('https://'), 'Slide 6 receives Cloudinary secureUrl');

    // 4.9 Export Single Slide as PNG (GET /api/carousels/:id/slides/:slideIndex/png)
    const pngExportRes = await request(app)
      .get(`/api/carousels/${carouselId}/slides/0/png`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(pngExportRes.status === 200, 'GET /api/carousels/:id/slides/:slideIndex/png returns HTTP 200');
    assert(pngExportRes.headers['content-type'] === 'image/png', 'Returns Content-Type: image/png');
    assert(pngExportRes.body.length > 1000, 'Returns non-empty PNG binary stream');

    // 4.10 Export All Slides as ZIP (GET /api/carousels/:id/export/zip)
    const zipExportRes = await request(app)
      .get(`/api/carousels/${carouselId}/export/zip`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(zipExportRes.status === 200, 'GET /api/carousels/:id/export/zip returns HTTP 200');
    assert(zipExportRes.headers['content-type'] === 'application/zip', 'Returns Content-Type: application/zip');
    assert(zipExportRes.headers['content-disposition'].includes('.zip'), 'Includes attachment filename in header');

    // 4.10b Export ZIP via query parameter token (INT-03 verification)
    const zipQueryTokenRes = await request(app)
      .get(`/api/carousels/${carouselId}/export/zip?token=${encodeURIComponent(tokenA)}`);

    assert(zipQueryTokenRes.status === 200, 'GET /api/carousels/:id/export/zip?token=... returns HTTP 200 via query auth');
    assert(zipQueryTokenRes.headers['content-type'] === 'application/zip', 'Query token auth returns application/zip');

    // 4.11 Delete Carousel (DELETE /api/carousels/:id)
    const deleteRes = await request(app)
      .delete(`/api/carousels/${carouselId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(deleteRes.status === 200, 'DELETE /api/carousels/:id returns HTTP 200');
    const checkDeleted = await Carousel.findById(carouselId);
    assert(checkDeleted === null, 'Carousel successfully removed from MongoDB');

    // Clean up draft reference
    const draftAfterDelete = await ContentDraft.findById(draft._id);
    assert(draftAfterDelete.carouselId === null, 'Draft carouselId unlinked on delete');

    console.log(`\n====================================================`);
    console.log(`CAROUSEL TEST RUN COMPLETE: ${passed} passed, ${failed} failed`);
    console.log(`====================================================`);
  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }

  process.exit(failed > 0 ? 1 : 0);
};

runCarouselTests();
