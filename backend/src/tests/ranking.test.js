import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Topic } from '../models/Topic.js';
import { NewsArticle } from '../models/NewsArticle.js';
import {
  calculateRecencyScore,
  calculateSourceQualityScore,
  calculateTopicRelevanceScore,
  calculateDiscussionPotentialScore,
  evaluateAndRankArticle,
  DEFAULT_SCORING_WEIGHTS
} from '../services/news/newsRanking.service.js';
import {
  calculateStorySimilarity,
  isSameUnderlyingEvent,
  mergeStorySources
} from '../services/news/duplicateDetection.service.js';

let mongod;

const runRankingTests = async () => {
  console.log('====================================================');
  console.log('   STARTING NEWS EVALUATION & RANKING TESTS         ');
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
    // 1. Recency Scoring Tests (30% weight)
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Recency Scoring & Outdated Decay ---');
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 3600 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000);

    const score2h = calculateRecencyScore(twoHoursAgo);
    const score12h = calculateRecencyScore(twelveHoursAgo);
    const score48h = calculateRecencyScore(twoDaysAgo);
    const score10d = calculateRecencyScore(tenDaysAgo);
    const score60d = calculateRecencyScore(sixtyDaysAgo);

    assert(score2h === 100, `Recent breaking news (<6h) receives 100 pts (got ${score2h})`);
    assert(score12h >= 90 && score12h <= 100, `12h old news receives 90-100 pts (got ${score12h})`);
    assert(score48h >= 65 && score48h <= 80, `48h old news decays to 65-80 pts (got ${score48h})`);
    assert(score10d <= 35, `Outdated news (10 days old) heavily penalized <= 35 pts (got ${score10d})`);
    assert(score60d <= 5, `Stale news (>30 days old) decays to <= 5 pts (got ${score60d})`);

    // -------------------------------------------------------------
    // 2. Source Quality Scoring & Reputable Sources (20% weight)
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Reputable Source Quality & Multi-Source Boost ---');
    const reutersScore = calculateSourceQualityScore('Reuters', 'https://reuters.com/tech/ai', 1);
    const techCrunchScore = calculateSourceQualityScore('TechCrunch', 'https://techcrunch.com/2026/01/post', 1);
    const infoQScore = calculateSourceQualityScore('InfoQ', 'https://infoq.com/news/article', 1);
    const unknownBlogScore = calculateSourceQualityScore('Random Crypto Blog', 'https://randomcryptoblog.xyz/post', 1);
    const multiSourceScore = calculateSourceQualityScore('Reuters', 'https://reuters.com/tech/ai', 3);

    assert(reutersScore >= 95, `Tier 1 source (Reuters) receives >= 95 pts (got ${reutersScore})`);
    assert(techCrunchScore >= 95, `Tier 1 source (TechCrunch) receives >= 95 pts (got ${techCrunchScore})`);
    assert(infoQScore >= 80 && infoQScore < 95, `Tier 2 source (InfoQ) receives 80-94 pts (got ${infoQScore})`);
    assert(unknownBlogScore < 60, `Unverified generic domain receives < 60 pts (got ${unknownBlogScore})`);
    assert(multiSourceScore > reutersScore || multiSourceScore === 100, `Multi-source corroboration boosts source score (got ${multiSourceScore})`);

    // -------------------------------------------------------------
    // 3. Discussion Potential & Topic Relevance
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Discussion Potential & Topic Relevance ---');
    const highDiscussion = calculateDiscussionPotentialScore({
      title: 'Anthropic benchmarks reveal Claude 3.5 Sonnet replaces GPT-4o on enterprise latency trade-offs',
      summary: 'Architectural shift prompts CTOs to rethink GPU infrastructure, with $500 million in annual savings.',
      facts: ['Enterprise migration shows 40% reduction in cloud cost', 'New benchmark proves latency drops under 200ms'],
      statistics: ['40% reduction', '$500 million']
    });

    const lowDiscussion = calculateDiscussionPotentialScore({
      title: 'Minor bug fix released for utility library version 1.0.3',
      summary: 'Developers patched a minor typo in logging output.',
      facts: []
    });

    assert(highDiscussion >= 80, `High professional discussion story scores >= 80 (got ${highDiscussion})`);
    assert(lowDiscussion <= 55, `Routine bug fix scores <= 55 (got ${lowDiscussion})`);

    const relevanceScore = calculateTopicRelevanceScore({
      title: 'Nvidia Blackwell Ultra GPU architecture delivers 3x inference efficiency',
      summary: 'Deep dive into datacenter cooling and next-generation tensor cores.',
      facts: ['Tensor core scaling benchmarked'],
      topicKeywords: ['nvidia', 'gpu', 'blackwell', 'inference'],
      topicName: 'AI Hardware Infrastructure'
    });

    assert(relevanceScore >= 80, `Strong keyword match yields topic relevance >= 80 (got ${relevanceScore})`);

    // -------------------------------------------------------------
    // 4. Combined 0-100 Scoring Calculation & Configurable Weights
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: Configurable Ranking Engine & 0-100 Score ---');
    const mockArticle = {
      title: 'OpenAI announces Operator AI agent preview for enterprise browser workflows',
      summary: 'Operator automates complex multi-step browser tasks, changing the future of work and developer tooling.',
      sourceUrl: 'https://techcrunch.com/2026/01/openai-operator-browser-agent',
      publisher: 'TechCrunch',
      publishedAt: new Date(now.getTime() - 3 * 3600 * 1000), // 3h ago
      facts: ['Autonomous browser agent executes multi-step web tasks'],
      sources: [{ url: 'https://techcrunch.com/2026/01/openai-operator-browser-agent', isPrimary: true }]
    };

    const mockTopic = {
      name: 'AI Agents & Automation',
      category: 'Artificial Intelligence',
      keywords: ['openai', 'agent', 'operator', 'automation']
    };

    const evaluation = evaluateAndRankArticle({
      article: mockArticle,
      topic: mockTopic
    });

    assert(evaluation.finalScore >= 80 && evaluation.finalScore <= 100, `Calculated final score is in 80-100 range (got ${evaluation.finalScore})`);
    assert(evaluation.scoreBreakdown.recency === 100, 'Score breakdown includes recency');
    assert(evaluation.scoreBreakdown.sourceQuality >= 95, 'Score breakdown includes sourceQuality');
    assert(evaluation.isShortlisted === true, 'High-scoring fresh story is automatically flagged as shortlisted');
    assert(typeof evaluation.shortlistReason === 'string' && evaluation.shortlistReason.length > 10, 'Generates why story was shortlisted');
    assert(typeof evaluation.linkedInAngle === 'string' && evaluation.linkedInAngle.length > 10, 'Generates why interesting for LinkedIn');

    // -------------------------------------------------------------
    // 5. Near-Duplicate & Event Similarity Detection
    // -------------------------------------------------------------
    console.log('\n--- Test Group 5: Duplicate & Near-Duplicate Detection ---');
    const story1 = {
      title: 'Nvidia unveils next-generation Blackwell Ultra AI chips for hyperscale datacenters',
      summary: 'CEO Jensen Huang announced the upgraded Blackwell architecture featuring enhanced liquid cooling.',
      publishedAt: now
    };

    const story1Syndicated = {
      title: 'Nvidia Unveils Next-Gen Blackwell Ultra AI Chips For Hyperscale Datacenters',
      summary: 'Jensen Huang unveiled the updated Blackwell platform with enhanced liquid cooling technology.',
      publishedAt: new Date(now.getTime() - 2 * 3600 * 1000)
    };

    const storyUnrelated = {
      title: 'Biotech startup secures Series A for protein folding research',
      summary: 'A novel CRISPR approach accelerates drug discovery.',
      publishedAt: now
    };

    const simSyndicated = calculateStorySimilarity(story1, story1Syndicated);
    const simUnrelated = calculateStorySimilarity(story1, storyUnrelated);

    assert(simSyndicated >= 0.60, `Detects syndicated/near-duplicate story (similarity: ${simSyndicated.toFixed(2)})`);
    assert(simUnrelated < 0.20, `Unrelated stories have low similarity (similarity: ${simUnrelated.toFixed(2)})`);

    // -------------------------------------------------------------
    // 6. Same Underlying Event & Multi-Source Merging
    // -------------------------------------------------------------
    console.log('\n--- Test Group 6: Event Clustering & Multi-Source Merging ---');
    const reutersCoverage = {
      title: 'Nvidia introduces Blackwell Ultra processors as tech giants boost AI capital spending',
      summary: 'Tech giants ramp up AI infrastructure investments with Nvidia latest silicon.',
      sourceUrl: 'https://reuters.com/technology/nvidia-blackwell-ultra-announcement',
      normalizedUrl: 'https://reuters.com/technology/nvidia-blackwell-ultra-announcement',
      publisher: 'Reuters',
      publishedAt: new Date(now.getTime() - 4 * 3600 * 1000)
    };

    const eventCheck = isSameUnderlyingEvent(story1, reutersCoverage, 72);
    assert(eventCheck.isMatch === true, `Identified stories covering the same underlying event (type: ${eventCheck.matchType})`);

    // Multi-source merge
    const storyToMerge = {
      title: story1.title,
      summary: story1.summary,
      sourceUrl: 'https://techcrunch.com/2026/01/nvidia-blackwell-ultra',
      normalizedUrl: 'https://techcrunch.com/2026/01/nvidia-blackwell-ultra',
      publisher: 'TechCrunch',
      publishedAt: now,
      sources: [
        {
          url: 'https://techcrunch.com/2026/01/nvidia-blackwell-ultra',
          normalizedUrl: 'https://techcrunch.com/2026/01/nvidia-blackwell-ultra',
          publisher: 'TechCrunch',
          title: story1.title,
          publishedAt: now,
          isPrimary: true
        }
      ],
      sourceCount: 1,
      facts: ['Liquid cooling is mandatory']
    };

    mergeStorySources(storyToMerge, reutersCoverage);
    assert(storyToMerge.sourceCount === 2, `Multi-source count incremented to 2 (got ${storyToMerge.sourceCount})`);
    assert(storyToMerge.sources.length === 2, 'Both sources preserved in sources array');
    assert(storyToMerge.sources.some((s) => s.publisher === 'Reuters'), 'Reuters preserved as additional source');

    // -------------------------------------------------------------
    // 7. API Endpoints: Evaluation, Approve, Reject & Status Flow
    // -------------------------------------------------------------
    console.log('\n--- Test Group 7: Endpoints for Evaluation, Approve, and Reject ---');
    const user = await User.create({
      name: 'Sarah Connor',
      email: 'sarah@skyline.io',
      password: 'StrongPassword123!'
    });
    const token = user.generateAuthToken();

    const topicDoc = await Topic.create({
      userId: user._id,
      name: 'Autonomous Agents',
      category: 'Software Development',
      keywords: ['agent', 'llm', 'autonomous', 'workflow'],
      freshness: '48h',
      priority: 'high'
    });

    const newsArticleDoc = await NewsArticle.create({
      userId: user._id,
      topicId: topicDoc._id,
      title: 'Docker announces native AI agent sandboxing runtime for containerized microservices',
      summary: 'New runtime isolates autonomous agent code execution with zero-trust permissions and resource quotas.',
      sourceUrl: 'https://techcrunch.com/2026/02/docker-agent-runtime',
      normalizedUrl: 'https://techcrunch.com/2026/02/docker-agent-runtime',
      publisher: 'TechCrunch',
      publishedAt: now,
      status: 'discovered'
    });

    // 7a. POST /api/news/:id/evaluate
    const evalRes = await request(app)
      .post(`/api/news/${newsArticleDoc._id}/evaluate`)
      .set('Authorization', `Bearer ${token}`);

    assert(evalRes.status === 200, `POST /api/news/:id/evaluate returns HTTP 200 (got ${evalRes.status})`);
    assert(evalRes.body.data.relevanceScore >= 70, `Evaluated score is >= 70 (got ${evalRes.body.data.relevanceScore})`);
    assert(['evaluated', 'shortlisted'].includes(evalRes.body.data.status), `Status transitioned to shortlisted or evaluated (got ${evalRes.body.data.status})`);
    assert(typeof evalRes.body.data.shortlistReason === 'string', 'Returns why the story was shortlisted');
    assert(typeof evalRes.body.data.linkedInAngle === 'string', 'Returns why it might be interesting for LinkedIn');

    // 7b. PATCH /api/news/:id/approve
    const approveRes = await request(app)
      .patch(`/api/news/${newsArticleDoc._id}/approve`)
      .set('Authorization', `Bearer ${token}`);

    assert(approveRes.status === 200, `PATCH /api/news/:id/approve returns HTTP 200 (got ${approveRes.status})`);
    assert(approveRes.body.data.status === 'selected', `Story status changed to 'selected' (got ${approveRes.body.data.status})`);
    assert(approveRes.body.data.isInteresting === true, 'Story is marked as interesting for content studio');

    // 7c. PATCH /api/news/:id/reject
    const rejectRes = await request(app)
      .patch(`/api/news/${newsArticleDoc._id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Not aligned with engineering audience' });

    assert(rejectRes.status === 200, `PATCH /api/news/:id/reject returns HTTP 200 (got ${rejectRes.status})`);
    assert(rejectRes.body.data.status === 'rejected', `Story status changed to 'rejected' (got ${rejectRes.body.data.status})`);
    assert(rejectRes.body.data.isInteresting === false, 'Rejected story is not marked interesting');
    assert(rejectRes.body.data.rejectionReason === 'Not aligned with engineering audience', 'Rejection reason recorded');

    // Verify rejection guard: rejected stories cannot be included in generation feed
    const defaultFeedRes = await request(app)
      .get('/api/news')
      .set('Authorization', `Bearer ${token}`);

    const hasRejectedInDefault = defaultFeedRes.body.data.items.some((i) => i._id.toString() === newsArticleDoc._id.toString() && i.status === 'rejected');
    assert(!hasRejectedInDefault, 'Rejected stories are excluded from default active feed');

    // Filter specifically by status=rejected
    const rejectedFeedRes = await request(app)
      .get('/api/news?status=rejected')
      .set('Authorization', `Bearer ${token}`);

    assert(rejectedFeedRes.body.data.items.length === 1, 'Status=rejected filter retrieves rejected stories');

    console.log('\n====================================================');
    console.log(`   RANKING ENGINE TESTS: ${passed} PASSED, ${failed} FAILED`);
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

runRankingTests();
