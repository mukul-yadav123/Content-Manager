process.env.TEST_MOCK_AI = 'true';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Topic } from '../models/Topic.js';
import { NewsArticle } from '../models/NewsArticle.js';
import { normalizeUrl } from '../utils/urlNormalizer.js';

let mongod;

const runNewsTests = async () => {
  console.log('====================================================');
  console.log('       STARTING NEWS DISCOVERY ENGINE TESTS         ');
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

    // 1. Test URL Normalizer
    console.log('--- Test Group 1: URL Normalizer ---');
    const dirtyUrl = 'https://TechCrunch.com/2026/11/ai-agents-breakthrough/?utm_source=twitter&utm_medium=social&fbclid=12345#comments';
    const cleanUrl = normalizeUrl(dirtyUrl);
    assert(cleanUrl === 'https://techcrunch.com/2026/11/ai-agents-breakthrough', 'Strips tracking parameters, lowercases host, removes trailing slash and hash');

    // 2. Setup User and Topic
    const user = await User.create({
      name: 'Marcus Vance',
      email: 'marcus@quantuminsights.com',
      password: 'SecurePassword789!'
    });
    const token = user.generateAuthToken();

    const topic = await Topic.create({
      userId: user._id,
      name: 'Quantum Machine Learning',
      category: 'Artificial Intelligence',
      keywords: ['quantum', 'qml', 'superconducting', 'algorithms'],
      region: 'global',
      freshness: '48h',
      priority: 'high'
    });

    console.log('\n--- Test Group 2: Manual News Discovery (POST /api/news/discover) ---');
    const discoverRes = await request(app)
      .post('/api/news/discover')
      .set('Authorization', `Bearer ${token}`)
      .send({
        topicId: topic._id.toString(),
        mode: 'ai'
      });

    assert(discoverRes.status === 200, 'POST /api/news/discover returns HTTP 200 OK');
    assert(discoverRes.body.success === true, 'Response contains success: true');
    assert(discoverRes.body.data.newlySavedCount > 0, 'Saves discovered news stories to MongoDB');
    assert(discoverRes.body.data.topic.name === 'Quantum Machine Learning', 'Correct topic associated');

    const firstArticleId = discoverRes.body.data.articles[0]._id;

    // Verify stored fields in MongoDB
    const storedArticle = await NewsArticle.findById(firstArticleId);
    assert(Boolean(storedArticle.title), 'Article has extracted headline/title');
    assert(Boolean(storedArticle.sourceUrl), 'Article has original sourceUrl');
    assert(Boolean(storedArticle.normalizedUrl), 'Article has normalizedUrl');
    assert(Boolean(storedArticle.publisher), 'Article has publisher/sourceName');
    assert(Boolean(storedArticle.discoveredAt), 'Article has discoveredAt timestamp');
    assert(storedArticle.topicId.equals(topic._id), 'Article is associated with topicId');
    assert(storedArticle.facts.length > 0, 'Article contains extracted facts array');
    assert(storedArticle.citations.length > 0, 'Article contains citation references');

    console.log('\n--- Test Group 3: Deduplication (Avoid duplicate stories) ---');
    // Run discovery again for the same topic
    const secondDiscoverRes = await request(app)
      .post('/api/news/discover')
      .set('Authorization', `Bearer ${token}`)
      .send({
        topicId: topic._id.toString(),
        mode: 'ai'
      });

    assert(secondDiscoverRes.status === 200, 'Second discovery runs successfully');
    assert(secondDiscoverRes.body.data.newlySavedCount === 0, '0 duplicate stories saved');
    assert(secondDiscoverRes.body.data.duplicatesSkipped > 0, 'Gracefully skips and reports already saved duplicates');

    console.log('\n--- Test Group 4: News Feed & Filters (GET /api/news) ---');
    const feedRes = await request(app)
      .get('/api/news')
      .set('Authorization', `Bearer ${token}`);

    assert(feedRes.status === 200, 'GET /api/news returns HTTP 200 OK');
    assert(feedRes.body.data.items.length > 0, 'Returns paginated news feed items');
    assert(feedRes.body.data.publishers.length > 0, 'Returns list of distinct publishers');

    // Filter by topic
    const topicFilteredRes = await request(app)
      .get(`/api/news?topicId=${topic._id}`)
      .set('Authorization', `Bearer ${token}`);
    assert(topicFilteredRes.body.data.items.length > 0, 'Filters news by topicId');

    console.log('\n--- Test Group 5: Get Details & Story Selection (PATCH /api/news/:id) ---');
    // Get Details
    const detailRes = await request(app)
      .get(`/api/news/${firstArticleId}`)
      .set('Authorization', `Bearer ${token}`);
    assert(detailRes.status === 200, 'GET /api/news/:id returns single story details');
    assert(detailRes.body.data.title === storedArticle.title, 'Details title matches');

    // Select story for generation / mark interesting
    const selectRes = await request(app)
      .patch(`/api/news/${firstArticleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'selected'
      });

    assert(selectRes.status === 200, 'PATCH /api/news/:id updates status');
    assert(selectRes.body.data.status === 'selected', 'Story status changed to "selected"');
    assert(selectRes.body.data.isInteresting === true, 'Story marked as interesting automatically');

    console.log('\n--- Test Group 6: Delete Story (DELETE /api/news/:id) ---');
    const deleteRes = await request(app)
      .delete(`/api/news/${firstArticleId}`)
      .set('Authorization', `Bearer ${token}`);

    assert(deleteRes.status === 200, 'DELETE /api/news/:id returns HTTP 200');

    const verifyDeleted = await NewsArticle.findById(firstArticleId);
    assert(verifyDeleted === null, 'Article successfully removed from MongoDB');

    console.log('\n====================================================');
    console.log(`   NEWS DISCOVERY TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('News test failed:', err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(0);
  }
};

runNewsTests();

