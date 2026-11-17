import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Topic } from '../models/Topic.js';
import { NewsArticle } from '../models/NewsArticle.js';
import ContentDraft from '../models/ContentDraft.js';
import {
  generateLinkedInPosts,
  regenerateHooksForApproach,
  regenerateSingleApproach,
  generateStructuredPostsFallback
} from '../services/ai/postGeneration.service.js';

let mongod;

const runPostGenerationTests = async () => {
  console.log('====================================================');
  console.log('   STARTING AI LINKEDIN CONTENT GENERATION TESTS    ');
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

    // -------------------------------------------------------------
    // 1. Test 3-Approach Generation Service
    // -------------------------------------------------------------
    console.log('--- Test Group 1: 3-Approach Generation Logic & Content Rules ---');
    const mockArticle = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Anthropic Unveils Claude 3.7 Sonnet with Hybrid Reasoning Architecture',
      publisher: 'VentureBeat',
      sourceUrl: 'https://venturebeat.com/ai/claude-3-7-hybrid-reasoning',
      summary: 'Anthropic released Claude 3.7 Sonnet, the first hybrid model offering both instantaneous responses and extended reasoning within one interface.',
      category: 'Artificial Intelligence',
      keyFacts: [
        'Claude 3.7 Sonnet is a hybrid model combining standard generation and chain-of-thought thinking.',
        'Users can adjust extended thinking budget up to 128,000 tokens.',
        'Benchmark accuracy shows a 14% improvement in software engineering tasks.'
      ],
      deepResearch: {
        mainEvent: 'Anthropic launched Claude 3.7 Sonnet with dual standard and extended reasoning modes.',
        summary: 'Major milestone in enterprise AI reasoning models with controllable compute budgets.',
        keyFacts: [
          'Claude 3.7 Sonnet introduces hybrid thinking capabilities.',
          'Thinking token budget can be controlled down to specific token limits.',
          'Scored 70.3% on SWE-bench Verified coding evaluation.'
        ],
        importantNumbers: [
          '128,000 token context budget: Maximum extended thinking budget',
          '70.3% SWE-bench score: Benchmark coding accuracy',
          '14% benchmark improvement: Gain over previous frontier models'
        ],
        confirmedClaims: [
          'Anthropic announced and released Claude 3.7 Sonnet globally.',
          'Model includes controllable thinking budget API parameter.'
        ],
        uncertainClaims: [
          'Long-term enterprise pricing adjustments under heavy extended thinking workloads.'
        ],
        industryImpact: 'Pressures competing model providers to offer unified single-model architectures rather than split fast vs reasoning models.',
        sources: [
          { title: 'Anthropic Announcement', publisher: 'Anthropic', url: 'https://anthropic.com/news/claude-3-7' }
        ]
      }
    };

    const mockTopic = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Generative AI & LLMs',
      category: 'Artificial Intelligence'
    };

    const result = await generateLinkedInPosts({
      article: mockArticle,
      research: mockArticle.deepResearch,
      topic: mockTopic,
      targetAudience: 'Software Engineers and AI Leaders',
      contentAngle: 'Developer workflow productivity',
      preferredStyle: 'authoritative'
    });

    assert(Array.isArray(result.variations) && result.variations.length === 3, 'Generates exactly 3 distinct post variations');
    
    const approaches = result.variations.map((v) => v.approach);
    assert(
      approaches.includes('news_update') &&
        approaches.includes('industry_analysis') &&
        approaches.includes('professional_opinion'),
      'Includes news_update, industry_analysis, and professional_opinion approaches'
    );

    // Verify properties of each approach
    result.variations.forEach((variation) => {
      assert(variation.hookOptions.length >= 3, `Variation ${variation.approach} includes at least 3 opening hook options`);
      assert(typeof variation.headline === 'string' && variation.headline.length > 0, `Variation ${variation.approach} includes headline`);
      assert(typeof variation.content === 'string' && variation.content.length > 50, `Variation ${variation.approach} includes complete post content`);
      assert(Array.isArray(variation.keyTakeaways) && variation.keyTakeaways.length >= 2, `Variation ${variation.approach} includes key takeaways`);
      assert(typeof variation.closingQuestion === 'string' && variation.closingQuestion.includes('?'), `Variation ${variation.approach} includes closing question`);
      assert(Array.isArray(variation.hashtags) && variation.hashtags.length >= 2 && variation.hashtags.length <= 5, `Variation ${variation.approach} includes 2-5 relevant hashtags`);
      assert(variation.sourceAttribution.includes(mockArticle.publisher), `Variation ${variation.approach} includes source attribution`);
      assert(typeof variation.suggestedImageConcept === 'string' && variation.suggestedImageConcept.length > 10, `Variation ${variation.approach} includes suggested image concept`);

      // Content Rules verification
      const lowerContent = variation.content.toLowerCase();
      assert(!lowerContent.includes('game-changer'), `Variation ${variation.approach} avoids cliché "game-changer"`);
      assert(!lowerContent.includes('let that sink in'), `Variation ${variation.approach} avoids cliché "let that sink in"`);
      assert(!lowerContent.includes("in today's fast-paced"), `Variation ${variation.approach} avoids generic opening phrase`);
    });

    // -------------------------------------------------------------
    // 2. Test Hook Regeneration & Single Approach Regeneration
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Hook Regeneration & Single Approach Regeneration ---');
    const newHooks = await regenerateHooksForApproach({
      approach: 'news_update',
      article: mockArticle,
      currentPostContent: result.variations[0].content,
      targetAudience: 'CTOs and Engineering Managers',
      contentAngle: 'Cost efficiency'
    });

    assert(Array.isArray(newHooks) && newHooks.length === 3, 'Regenerates 3 brand new hook options');
    assert(newHooks.every((h) => typeof h === 'string' && h.length > 10), 'All regenerated hooks are non-empty strings');

    const singleRegen = await regenerateSingleApproach({
      approach: 'industry_analysis',
      article: mockArticle,
      research: mockArticle.deepResearch,
      topic: mockTopic,
      targetAudience: 'Venture Capitalists',
      contentAngle: 'Market consolidation',
      preferredStyle: 'analytical'
    });

    assert(singleRegen.approach === 'industry_analysis', 'Regenerates specific approach (industry_analysis)');
    assert(singleRegen.hookOptions.length >= 3, 'Regenerated approach contains hook options');
    assert(singleRegen.content.length > 50, 'Regenerated approach contains post body');

    // -------------------------------------------------------------
    // 3. Test Full Studio API Workflow with Auth
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Studio API Endpoints & Multi-User Isolation ---');

    // Setup User A
    const registerA = await request(app).post('/api/auth/register').send({
      name: 'Studio User A',
      email: 'studio.a@example.com',
      password: 'Password123!'
    });
    const tokenA = registerA.body.data.token;

    // Setup User B
    const registerB = await request(app).post('/api/auth/register').send({
      name: 'Studio User B',
      email: 'studio.b@example.com',
      password: 'Password123!'
    });
    const tokenB = registerB.body.data.token;

    // Create Topic for User A
    const topicDoc = await Topic.create({
      userId: registerA.body.data.user._id,
      name: 'Artificial Intelligence',
      category: 'Artificial Intelligence',
      keywords: ['Anthropic', 'Claude', 'LLM']
    });

    // Create NewsArticle for User A
    const articleDoc = await NewsArticle.create({
      userId: registerA.body.data.user._id,
      topicId: topicDoc._id,
      title: 'Anthropic Unveils Claude 3.7 Sonnet with Hybrid Reasoning Architecture',
      sourceUrl: 'https://venturebeat.com/ai/claude-3-7-hybrid-reasoning',
      publisher: 'VentureBeat',
      publishedAt: new Date(),
      discoveredAt: new Date(),
      summary: 'Anthropic released Claude 3.7 Sonnet, the first hybrid reasoning model.',
      relevanceScore: 92,
      status: 'shortlisted',
      deepResearch: mockArticle.deepResearch
    });

    // 3.1 POST /api/studio/generate
    const genRes = await request(app)
      .post('/api/studio/generate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        articleId: articleDoc._id.toString(),
        targetAudience: 'Senior Software Engineers',
        contentAngle: 'Developer productivity gains',
        preferredStyle: 'authoritative'
      });

    assert(genRes.status === 201, 'POST /api/studio/generate returns 201 Created');
    assert(genRes.body.data._id, 'Returns created draft ID');
    assert(genRes.body.data.variations.length === 3, 'Draft stores all 3 variations');
    assert(genRes.body.data.selectedApproach === 'news_update', 'Defaults to news_update approach');
    assert(genRes.body.data.isHumanized === false, 'Maintains isHumanized: false initially');
    assert(genRes.body.data.initialDraft.body.length > 0, 'Preserves initialDraft separately');

    const draftId = genRes.body.data._id;

    // 3.2 Verify Article status updated
    const updatedArticle = await NewsArticle.findById(articleDoc._id);
    assert(updatedArticle.status === 'selected', 'Elevates article status to "selected" upon post generation');

    // 3.3 GET /api/studio/drafts
    const listRes = await request(app)
      .get('/api/studio/drafts')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(listRes.status === 200, 'GET /api/studio/drafts returns 200 OK');
    const draftsList = listRes.body.data.items || listRes.body.data;
    assert(draftsList.length === 1, 'Returns user drafts in list');

    // Multi-tenant check: User B sees 0 drafts
    const listResB = await request(app)
      .get('/api/studio/drafts')
      .set('Authorization', `Bearer ${tokenB}`);

    const draftsListB = listResB.body.data.items || listResB.body.data;
    assert(draftsListB.length === 0, 'Multi-user isolation: User B cannot see User A drafts');

    // 3.4 GET /api/studio/drafts/:id
    const singleRes = await request(app)
      .get(`/api/studio/drafts/${draftId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(singleRes.status === 200, 'GET /api/studio/drafts/:id returns 200 OK');
    assert(singleRes.body.data.variations.length === 3, 'Returns all 3 variations for comparison');
    assert(singleRes.body.data.newsArticleId.title === mockArticle.title, 'Populates news article reference');

    // User B cannot get User A draft
    const singleResB = await request(app)
      .get(`/api/studio/drafts/${draftId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert(singleResB.status === 404, 'Prevents User B from accessing User A draft by ID');

    // -------------------------------------------------------------
    // 4. Test Variation Selection, Hook Regeneration, and Angle Change
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: Variation Switching, Hook Regeneration & Angle Update ---');

    // 4.1 Select Variation: Switch to Industry Analysis
    const selectRes = await request(app)
      .patch(`/api/studio/drafts/${draftId}/select-variation`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        approach: 'industry_analysis'
      });

    assert(selectRes.status === 200, 'PATCH /api/studio/drafts/:id/select-variation returns 200 OK');
    assert(selectRes.body.data.selectedApproach === 'industry_analysis', 'Updates selectedApproach to industry_analysis');
    assert(selectRes.body.data.body === selectRes.body.data.variations.find(v => v.approach === 'industry_analysis').content, 'Synchronizes active body with selected approach content');

    // 4.2 Regenerate Hooks for Industry Analysis
    const regenHooksRes = await request(app)
      .post(`/api/studio/drafts/${draftId}/regenerate-hooks`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        approach: 'industry_analysis',
        contentAngle: 'Competitive moat'
      });

    assert(regenHooksRes.status === 200, 'POST /api/studio/drafts/:id/regenerate-hooks returns 200 OK');
    assert(regenHooksRes.body.data.hookOptions.length === 3, 'Returns 3 regenerated hook options');
    assert(regenHooksRes.body.data.draft.hook === regenHooksRes.body.data.hookOptions[0], 'Updates active draft hook when matching active approach');

    // 4.3 Change Content Angle
    const angleRes = await request(app)
      .patch(`/api/studio/drafts/${draftId}/angle`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        contentAngle: 'Enterprise AI Governance and Compliance'
      });

    assert(angleRes.status === 200, 'PATCH /api/studio/drafts/:id/angle returns 200 OK');
    assert(angleRes.body.data.contentAngle === 'Enterprise AI Governance and Compliance', 'Updates draft contentAngle');
    assert(angleRes.body.data.variations.length === 3, 'Regenerates all 3 variations with updated content angle');

    // 4.4 Update Draft Manually
    const updateRes = await request(app)
      .put(`/api/studio/drafts/${draftId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Custom Edited Title for Claude 3.7',
        hook: 'Handcrafted hook by creator:',
        status: 'ready'
      });

    assert(updateRes.status === 200, 'PUT /api/studio/drafts/:id returns 200 OK');
    assert(updateRes.body.data.title === 'Custom Edited Title for Claude 3.7', 'Updates draft title');
    assert(updateRes.body.data.hook === 'Handcrafted hook by creator:', 'Updates draft hook');
    assert(updateRes.body.data.status === 'ready', 'Updates draft status to ready');
    assert(updateRes.body.data.revisionHistory.length >= 1, 'Records edit in revisionHistory');

    // 4.5 Delete Draft
    const delRes = await request(app)
      .delete(`/api/studio/drafts/${draftId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(delRes.status === 200, 'DELETE /api/studio/drafts/:id returns 200 OK');

    const checkDel = await ContentDraft.findById(draftId);
    assert(!checkDel, 'Draft successfully removed from database');
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

runPostGenerationTests();
