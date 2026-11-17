import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Topic } from '../models/Topic.js';
import { NewsArticle } from '../models/NewsArticle.js';
import ContentDraft from '../models/ContentDraft.js';
import MediaAsset from '../models/MediaAsset.js';
import {
  synthesizeImagePrompt,
  generateImageFromOpenAI,
  generateAndSavePostImage
} from '../services/ai/imageGeneration.service.js';
import { uploadImageFromUrl, deleteImage } from '../services/storage/cloudinary.service.js';
import {
  buildImagePrompt,
  IMAGE_STYLE_DESCRIPTIONS,
  STRICT_NEGATIVE_IMAGE_INSTRUCTIONS
} from '../prompts/imageGeneration.prompt.js';

let mongod;

const runMediaTests = async () => {
  console.log('====================================================');
  console.log('      STARTING AI IMAGE GENERATION TESTS           ');
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
    await MediaAsset.init();

    // -------------------------------------------------------------
    // Test Group 1: Image Prompt Builder & Style Variety
    // -------------------------------------------------------------
    console.log('--- Test Group 1: 6 Image Styles & Negative Text Directives ---');

    const styles = [
      'editorial',
      'tech_illustration',
      'business_illustration',
      'news_graphic',
      'data_visual',
      'minimalist_concept'
    ];

    styles.forEach((style) => {
      const promptObj = buildImagePrompt({
        headline: 'Nvidia releases Blackwell Ultra architecture',
        concept: 'High-density computational clusters in a clean server room',
        style,
        aspectRatio: '1:1'
      });

      assert(typeof promptObj.prompt === 'string' && promptObj.prompt.length > 50, `Generates valid prompt for style "${style}"`);
      assert(promptObj.prompt.includes(STRICT_NEGATIVE_IMAGE_INSTRUCTIONS), `Enforces strict text-free directive for "${style}"`);
      assert(promptObj.size === '1024x1024', `Default aspect ratio 1:1 produces 1024x1024`);
    });

    // Test 16:9 Landscape ratio
    const landscapePrompt = buildImagePrompt({
      headline: 'Autonomous AI Agents Surge in Enterprise',
      style: 'tech_illustration',
      aspectRatio: '16:9'
    });
    assert(landscapePrompt.size === '1792x1024', '16:9 aspect ratio generates 1792x1024 dimensions');

    // -------------------------------------------------------------
    // Test Group 2: Cloudinary Storage & Mock Fallbacks
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Cloudinary Storage Service & Deletion ---');

    const uploadRes = await uploadImageFromUrl(
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      'linkedin-content-studio/posts',
      'tech_illustration'
    );

    assert(uploadRes.publicId && uploadRes.publicId.length > 5, 'Upload service returns Cloudinary publicId');
    assert(uploadRes.secureUrl.startsWith('https://'), 'Upload service returns HTTPS secureUrl');
    assert(uploadRes.format === 'webp', 'Upload service specifies webp format');
    assert(uploadRes.width === 1024 && uploadRes.height === 1024, 'Preserves image dimensions (1024x1024)');

    const deleteRes = await deleteImage(uploadRes.publicId);
    assert(deleteRes.result === 'ok', 'Delete image service successfully handles asset removal');

    // -------------------------------------------------------------
    // Test Group 3: End-to-End Image Generation API Workflows
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Media API Endpoints & Multiple Image Associations ---');

    // Setup Users
    const regResA = await request(app).post('/api/auth/register').send({
      name: 'Media User A',
      email: 'media.a@example.com',
      password: 'Password123!'
    });
    const tokenA = regResA.body.data.token;
    const userA = regResA.body.data.user;

    const regResB = await request(app).post('/api/auth/register').send({
      name: 'Media User B',
      email: 'media.b@example.com',
      password: 'Password123!'
    });
    const tokenB = regResB.body.data.token;

    // Create Topic & NewsArticle
    const topic = await Topic.create({
      userId: userA._id,
      name: 'Semiconductors & AI Hardware',
      category: 'Technology'
    });

    const article = await NewsArticle.create({
      userId: userA._id,
      topicId: topic._id,
      title: 'Nvidia introduces Blackwell Ultra with 288GB HBM3e Memory',
      sourceUrl: 'https://nvidia.com/news/blackwell-ultra',
      publisher: 'Nvidia Press',
      publishedAt: new Date(),
      discoveredAt: new Date(),
      summary: 'Nvidia announced Blackwell Ultra chip architecture with record memory bandwidth.',
      relevanceScore: 95
    });

    // Create Draft
    const draft = await ContentDraft.create({
      userId: userA._id,
      topicId: topic._id,
      newsArticleId: article._id,
      title: 'What Nvidia Blackwell Ultra Means for AI Infrastructure',
      hook: 'Nvidia just raised the bar on compute density:',
      body: 'The new Blackwell Ultra architecture features 288GB of ultra-fast HBM3e memory.\n\n• 50% increase in memory capacity\n• Substantial latency reduction on large reasoning models\n\nInfrastructure teams should plan for cooling requirements.',
      cta: 'How is your data center roadmap adapting to next-gen memory footprints?',
      suggestedImageConcept: 'A glowing 3D silicon semiconductor wafer with intricate luminous circuit pathways',
      status: 'draft'
    });

    const draftId = draft._id.toString();

    // 3.1 POST /api/media/generate-prompt (Prompt preview only)
    const promptRes = await request(app)
      .post('/api/media/generate-prompt')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId,
        style: 'tech_illustration'
      });

    assert(promptRes.status === 200, 'POST /api/media/generate-prompt returns 200 OK');
    assert(promptRes.body.data.prompt.length > 30, 'Returns detailed prompt');
    assert(promptRes.body.data.concept.length > 10, 'Returns image concept description');

    // 3.2 POST /api/media/generate (First Image: Tech Illustration)
    const initialHookBefore = draft.hook;
    const initialBodyBefore = draft.body;

    const genRes = await request(app)
      .post('/api/media/generate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        draftId,
        style: 'tech_illustration',
        aspectRatio: '1:1'
      });

    assert(genRes.status === 201, 'POST /api/media/generate returns 201 Created');
    assert(genRes.body.data._id, 'Returns created MediaAsset ID');
    assert(genRes.body.data.secureUrl.startsWith('https://'), 'Returns Cloudinary secure URL');
    assert(genRes.body.data.imageStyle === 'tech_illustration', 'Stores imageStyle');
    assert(genRes.body.data.isPreferred === true, 'First generated image automatically marked as preferred');
    assert(genRes.body.data.generationModel === 'dall-e-3', 'Records dall-e-3 generation model');

    const firstAssetId = genRes.body.data._id;

    // Verify Content Invariance: Image generation does NOT change post text
    const updatedDraft = await ContentDraft.findById(draftId);
    assert(updatedDraft.hook === initialHookBefore, 'Post hook remains invariant when generating image');
    assert(updatedDraft.body === initialBodyBefore, 'Post body remains invariant when generating image');
    assert(updatedDraft.mediaAssets.length === 1, 'Draft references mediaAsset in mediaAssets array');
    assert(updatedDraft.selectedMediaAsset.toString() === firstAssetId.toString(), 'Draft sets selectedMediaAsset');

    // 3.3 POST /api/media/drafts/:draftId/variation (Second Image Variation: Minimalist Concept)
    const varRes = await request(app)
      .post(`/api/media/drafts/${draftId}/variation`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        style: 'minimalist_concept',
        aspectRatio: '1:1'
      });

    assert(varRes.status === 201, 'POST /api/media/drafts/:draftId/variation returns 201 Created');
    assert(varRes.body.data.imageStyle === 'minimalist_concept', 'Variation stores distinct style');
    assert(varRes.body.data._id !== firstAssetId, 'Variation generates a new unique asset ID');

    const secondAssetId = varRes.body.data._id;

    // Verify multiple images associated with one post
    const draftWithTwoImages = await ContentDraft.findById(draftId);
    assert(draftWithTwoImages.mediaAssets.length === 2, 'Post allows multiple images to be associated (mediaAssets = 2)');

    // 3.4 GET /api/media/drafts/:draftId
    const listRes = await request(app)
      .get(`/api/media/drafts/${draftId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(listRes.status === 200, 'GET /api/media/drafts/:draftId returns 200 OK');
    assert(listRes.body.data.items.length === 2, 'Retrieves all media assets for the post');
    assert(listRes.body.data.selectedMediaAssetId.toString() === firstAssetId.toString(), 'Returns current selectedMediaAssetId');

    // Multi-tenant check: User B cannot access User A's media
    const listResB = await request(app)
      .get(`/api/media/drafts/${draftId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert(listResB.status === 404, 'Prevents User B from accessing User A draft media');

    // 3.5 PATCH /api/media/:id/select (Select Second Image as Preferred)
    const selectRes = await request(app)
      .patch(`/api/media/${secondAssetId}/select`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(selectRes.status === 200, 'PATCH /api/media/:id/select returns 200 OK');
    assert(selectRes.body.data.isPreferred === true, 'Updates chosen image isPreferred to true');

    const draftAfterSelect = await ContentDraft.findById(draftId);
    assert(draftAfterSelect.selectedMediaAsset.toString() === secondAssetId.toString(), 'Updates draft.selectedMediaAsset to chosen image');

    // 3.6 DELETE /api/media/:id (Delete First Image)
    const delRes = await request(app)
      .delete(`/api/media/${firstAssetId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(delRes.status === 200, 'DELETE /api/media/:id returns 200 OK');

    const checkDelAsset = await MediaAsset.findById(firstAssetId);
    assert(!checkDelAsset, 'MediaAsset removed from MongoDB');

    const draftAfterDelete = await ContentDraft.findById(draftId);
    assert(draftAfterDelete.mediaAssets.length === 1, 'Draft mediaAssets array updated after image deletion');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }

    console.log('\n====================================================');
    console.log(`TEST RUN COMPLETE: ${passed} passed, ${failed} failed`);
    console.log('====================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
};

runMediaTests();

