import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Topic } from '../models/Topic.js';

let mongod;

const runTopicTests = async () => {
  console.log('====================================================');
  console.log('       STARTING TOPICS & DASHBOARD API TESTS        ');
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

    // 1. Create Test User & Generate Token
    const user = await User.create({
      name: 'Elena Rostova',
      email: 'elena@techpulse.ai',
      password: 'StrongPassword456!'
    });
    const token = user.generateAuthToken();

    console.log('--- Test Group 1: Create Topic ---');
    const createRes = await request(app)
      .post('/api/topics')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Autonomous AI Agents',
        category: 'Artificial Intelligence',
        industry: 'AI & Automation',
        description: 'Multi-agent systems, swarm intelligence, and agent workflows',
        keywords: ['agents', 'swarms', 'autonomous', 'crewai'],
        region: 'global',
        freshness: '24h',
        priority: 'high',
        isActive: true
      });

    assert(createRes.status === 201, 'POST /api/topics returns HTTP 201 Created');
    assert(createRes.body.success === true, 'Response contains success: true');
    assert(createRes.body.data.name === 'Autonomous AI Agents', 'Topic name matches');
    assert(createRes.body.data.keywords.length === 4, 'Keywords array populated');
    assert(createRes.body.data.priority === 'high', 'Priority set to high');
    assert(createRes.body.data.freshness === '24h', 'Freshness set to 24h');

    const topicId = createRes.body.data._id;

    // Test Duplicate Name Rejection
    const dupRes = await request(app)
      .post('/api/topics')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Autonomous AI Agents',
        category: 'Artificial Intelligence'
      });
    assert(dupRes.status === 400, 'POST /api/topics rejects duplicate topic name with HTTP 400');

    // Create Second Topic
    await request(app)
      .post('/api/topics')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cloud Native & Kubernetes',
        category: 'Software Development',
        keywords: ['k8s', 'docker', 'devops'],
        priority: 'medium'
      });

    console.log('\n--- Test Group 2: Get Topics & Filters ---');
    const listRes = await request(app)
      .get('/api/topics')
      .set('Authorization', `Bearer ${token}`);

    assert(listRes.status === 200, 'GET /api/topics returns HTTP 200 OK');
    assert(listRes.body.data.items.length === 2, 'Returns both topics for user');
    assert(listRes.body.data.pagination.totalItems === 2, 'Pagination metadata matches');

    // Category Filter
    const filterRes = await request(app)
      .get('/api/topics?category=Artificial Intelligence')
      .set('Authorization', `Bearer ${token}`);
    assert(filterRes.body.data.items.length === 1, 'Filter by category returns 1 matching topic');

    // Categories Metadata Endpoint
    const catRes = await request(app)
      .get('/api/topics/categories')
      .set('Authorization', `Bearer ${token}`);
    assert(catRes.status === 200, 'GET /api/topics/categories returns HTTP 200');
    assert(catRes.body.data.categories.length > 0, 'Returns category list');

    console.log('\n--- Test Group 3: Update & Toggle ---');
    const updateRes = await request(app)
      .put(`/api/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Updated description for autonomous agents',
        priority: 'medium'
      });

    assert(updateRes.status === 200, 'PUT /api/topics/:id returns HTTP 200');
    assert(updateRes.body.data.priority === 'medium', 'Priority updated to medium');

    // Toggle Active Status
    const toggleRes = await request(app)
      .patch(`/api/topics/${topicId}/toggle`)
      .set('Authorization', `Bearer ${token}`);
    assert(toggleRes.status === 200, 'PATCH /api/topics/:id/toggle returns HTTP 200');
    assert(toggleRes.body.data.isActive === false, 'Toggled isActive to false');

    console.log('\n--- Test Group 4: Dashboard Overview ---');
    const dashRes = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${token}`);

    assert(dashRes.status === 200, 'GET /api/dashboard/overview returns HTTP 200');
    assert(dashRes.body.data.metrics.totalTopics === 2, 'Metrics reflect 2 total topics');
    assert(dashRes.body.data.metrics.activeTopics === 1, 'Metrics reflect 1 active topic');

    console.log('\n--- Test Group 5: Delete Topic ---');
    const deleteRes = await request(app)
      .delete(`/api/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`);

    assert(deleteRes.status === 200, 'DELETE /api/topics/:id returns HTTP 200');

    const verifyDeleted = await Topic.findById(topicId);
    assert(verifyDeleted === null, 'Topic removed from database');

    console.log('\n====================================================');
    console.log(`   TOPIC & DASHBOARD TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Topic test failure:', err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(0);
  }
};

runTopicTests();

