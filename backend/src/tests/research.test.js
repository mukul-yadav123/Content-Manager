import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Topic } from '../models/Topic.js';
import { NewsArticle } from '../models/NewsArticle.js';
import {
  conductDeepNewsResearch,
  sanitizeAndValidateResearchResult,
  generateStructuredResearchFallback
} from '../services/ai/deepResearch.service.js';

let mongod;

const runDeepResearchTests = async () => {
  console.log('====================================================');
  console.log('     STARTING AI DEEP RESEARCH & ANALYSIS TESTS     ');
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
    await Topic.init();
    await NewsArticle.init();

    // -------------------------------------------------------------
    // 1. Test Structured Deep Research Schema & Fact-Checking
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Deep Research Schema & Fact-Checking Structure ---');
    const research = await conductDeepNewsResearch({
      title: 'Meta introduces Llama 4 Scout with 10M token context window and 92% benchmark accuracy',
      summary: 'New open-weights model features architecture breakthroughs for long-context reasoning with $800M in compute investment.',
      sourceUrl: 'https://techcrunch.com/2026/02/meta-llama-4-scout',
      publisher: 'TechCrunch',
      publishedAt: new Date(),
      topicName: 'Open Source AI Models',
      topicCategory: 'Artificial Intelligence'
    });

    assert(typeof research.mainEvent === 'string' && research.mainEvent.length > 20, 'Generates clear mainEvent statement');
    assert(typeof research.summary === 'string' && research.summary.length > 30, 'Generates deep contextual summary');
    assert(Array.isArray(research.keyFacts) && research.keyFacts.length >= 2, 'Extracts verified keyFacts array');
    assert(Array.isArray(research.importantNumbers) && research.importantNumbers.length >= 1, 'Captures numbers and metrics (e.g. 10M, 92%, $800M)');
    assert(Array.isArray(research.entities) && research.entities.length >= 1, 'Extracts entities involved with roles and categories');
    assert(Array.isArray(research.confirmedClaims) && research.confirmedClaims.length >= 1, 'Distinctly identifies confirmed claims');
    assert(Array.isArray(research.uncertainClaims) && research.uncertainClaims.length >= 1, 'Distinctly separates uncertain claims / forward-looking statements');
    assert(typeof research.industryImpact === 'string' && research.industryImpact.length > 30, 'Identifies broader industry impact');
    assert(Array.isArray(research.possibleAngles) && research.possibleAngles.length >= 3, 'Generates at least 3 LinkedIn professional discussion angles');
    assert(Array.isArray(research.sources) && research.sources.length >= 2, 'Corroborates with multiple independent sources');
    assert(research.sources[0].isPrimary === true, 'Preserves original source as primary');
    assert(Array.isArray(research.contradictions), 'Includes contradictions array');

    // -------------------------------------------------------------
    // 2. Database Integration & API Tests
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Deep Research API & Persistence (POST/GET/PATCH) ---');
    const user = await User.create({
      name: 'Elena Rostova',
      email: 'elena@frontiertech.org',
      password: 'SecurePassword123!'
    });
    const token = user.generateAuthToken();

    const topic = await Topic.create({
      userId: user._id,
      name: 'AI Infrastructure',
      category: 'Technology',
      keywords: ['gpu', 'datacenter', 'compute', 'inference'],
      freshness: '48h',
      priority: 'high'
    });

    const article = await NewsArticle.create({
      userId: user._id,
      topicId: topic._id,
      title: 'Google DeepMind achieves breakthrough in zero-shot theorem proving with AlphaProof 2',
      summary: 'Mathematical reasoning engine solves 88% of competitive olympiad challenges using formal verification and RL.',
      sourceUrl: 'https://nature.com/articles/alphaproof-2-breakthrough',
      publisher: 'Nature',
      publishedAt: new Date(),
      status: 'shortlisted'
    });

    // 2a. POST /api/news/:id/research
    const researchRes = await request(app)
      .post(`/api/news/${article._id}/research`)
      .set('Authorization', `Bearer ${token}`);

    assert(researchRes.status === 200, `POST /api/news/:id/research returns HTTP 200 (got ${researchRes.status})`);
    assert(researchRes.body.data.research.mainEvent.length > 0, 'Response contains deep research mainEvent');
    assert(researchRes.body.data.research.confirmedClaims.length > 0, 'Response contains confirmed claims');
    assert(researchRes.body.data.research.uncertainClaims.length > 0, 'Response contains uncertain claims');
    assert(researchRes.body.data.research.sources.length >= 2, 'Response contains multi-source corroboration');

    // Verify MongoDB document was persisted
    const updatedArticle = await NewsArticle.findById(article._id);
    assert(updatedArticle.hasDeepResearch === true, 'MongoDB document sets hasDeepResearch: true');
    assert(updatedArticle.deepResearch !== null, 'MongoDB document stores deepResearch sub-document');
    assert(updatedArticle.deepResearch.possibleAngles.length >= 3, 'Persisted possibleAngles array');
    assert(updatedArticle.sourceCount >= 2, 'Multi-source count updated in MongoDB');
    assert(updatedArticle.status === 'selected', 'Article status updated to selected for content studio');

    // 2b. GET /api/news/:id/research
    const getResearchRes = await request(app)
      .get(`/api/news/${article._id}/research`)
      .set('Authorization', `Bearer ${token}`);

    assert(getResearchRes.status === 200, `GET /api/news/:id/research returns HTTP 200 (got ${getResearchRes.status})`);
    assert(getResearchRes.body.data.research.mainEvent === updatedArticle.deepResearch.mainEvent, 'Retrieved research matches persisted data');
    assert(getResearchRes.body.data.sourceCount >= 2, 'Retrieved source count matches');

    // 2c. PATCH /api/news/:id/research (User notes & review)
    const patchRes = await request(app)
      .patch(`/api/news/${article._id}/research`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        userNotes: 'Emphasize implications for automated smart contract auditing and formal verification in FinTech.',
        possibleAngles: [
          'Why formal verification changes software reliability forever.',
          'Is benchmark accuracy solving real-world production challenges?'
        ]
      });

    assert(patchRes.status === 200, `PATCH /api/news/:id/research returns HTTP 200 (got ${patchRes.status})`);
    assert(patchRes.body.data.research.userNotes.includes('FinTech'), 'User notes updated and saved');
    assert(patchRes.body.data.research.possibleAngles.length === 2, 'Custom possibleAngles updated');

    // -------------------------------------------------------------
    // 3. Rejection Guard
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Rejection Guard & Status Protection ---');
    const rejectedArticle = await NewsArticle.create({
      userId: user._id,
      topicId: topic._id,
      title: 'Disputed rumor regarding unannounced hardware roadmap',
      summary: 'Unverified blog claims new chip launch without primary confirmation.',
      sourceUrl: 'https://unverifiedblog.xyz/hardware-rumor',
      publisher: 'Unknown Blog',
      status: 'rejected'
    });

    const rejectedResearchRes = await request(app)
      .post(`/api/news/${rejectedArticle._id}/research`)
      .set('Authorization', `Bearer ${token}`);

    assert(rejectedResearchRes.status === 400, `POST /api/news/:id/research rejects rejected story with HTTP 400 (got ${rejectedResearchRes.status})`);

    console.log('\n====================================================');
    console.log(`   DEEP RESEARCH TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    await mongod.stop();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    if (mongod) await mongod.stop();
    process.exit(1);
  }
};

runDeepResearchTests();

