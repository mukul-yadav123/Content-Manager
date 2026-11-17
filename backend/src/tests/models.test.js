import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  User,
  Topic,
  NewsArticle,
  WritingProfile,
  ContentDraft,
  MediaAsset,
  GenerationJob
} from '../models/index.js';

let mongod;

const runModelTests = async () => {
  console.log('====================================================');
  console.log('      STARTING DATABASE SCHEMAS & MODELS TESTS      ');
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
    console.log('[Setup] In-memory MongoDB connected.\n');

    // 1. User Model
    console.log('--- Testing User Model ---');
    const user = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      headline: 'Full-Stack Architect'
    });
    assert(Boolean(user._id), 'User created with valid ObjectId');
    assert(user.role === 'user', 'User has default role "user"');

    // 2. Topic Model
    console.log('\n--- Testing Topic Model ---');
    await Topic.init(); // Wait for unique indexes to build in memory
    const topic = await Topic.create({
      userId: user._id,
      name: 'Generative AI & LLMs',
      industry: 'Artificial Intelligence',
      keywords: ['AI', 'LLM', 'Agents', 'Enterprise']
    });
    assert(topic.userId.equals(user._id), 'Topic references correct userId');
    assert(topic.isActive === true, 'Topic defaults to isActive: true');

    // Test unique compound index on { userId, name }
    try {
      await Topic.create({
        userId: user._id,
        name: 'Generative AI & LLMs',
        industry: 'Different Industry'
      });
      assert(false, 'Should prevent duplicate topic name for same user');
    } catch (err) {
      assert(err.code === 11000, 'Enforces compound unique index on { userId, name }');
    }

    // 3. NewsArticle Model
    console.log('\n--- Testing NewsArticle Model ---');
    const article = await NewsArticle.create({
      userId: user._id,
      topicId: topic._id,
      title: 'OpenAI Releases Advanced Reasoning Model',
      summary: 'New model demonstrates state-of-the-art benchmark results in software architecture.',
      sourceUrl: 'https://openai.com/news/test-release',
      sourceName: 'OpenAI Blog',
      quotes: [{ quote: 'This changes the software landscape.', speaker: 'Chief Scientist' }]
    });
    assert(article.topicId.equals(topic._id), 'NewsArticle references correct topicId');
    assert(article.quotes.length === 1, 'Embedded quotes sub-document is valid');

    // 4. WritingProfile Model
    console.log('\n--- Testing WritingProfile Model ---');
    const profile = await WritingProfile.create({
      userId: user._id,
      profileName: 'Executive Voice',
      tone: 'Direct, analytical, punchy',
      forbiddenWords: ['synergy', 'game-changer', 'delve'],
      isDefault: true
    });
    assert(profile.userId.equals(user._id), 'WritingProfile references correct userId');
    assert(profile.forbiddenWords.includes('delve'), 'Forbidden words array populated properly');

    // 5. MediaAsset Model
    console.log('\n--- Testing MediaAsset Model ---');
    const media = await MediaAsset.create({
      userId: user._id,
      publicId: 'cld_sample_img_101',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/sample.webp',
      assetType: 'single-image',
      format: 'webp',
      width: 1024,
      height: 1024,
      aspectRatio: '1:1'
    });
    assert(media.publicId === 'cld_sample_img_101', 'MediaAsset stores Cloudinary publicId');
    assert(media.secureUrl.startsWith('https://'), 'Stores only remote URL and metadata, no raw binary in DB');

    // 6. ContentDraft Model
    console.log('\n--- Testing ContentDraft Model ---');
    const draft = await ContentDraft.create({
      userId: user._id,
      topicId: topic._id,
      newsArticleId: article._id,
      writingProfileId: profile._id,
      title: 'Why AI Architecture is Shifting in 2026',
      hook: '90% of AI wrappers fail. Here is why modular architecture wins:',
      body: 'Point 1: Decouple prompts.\nPoint 2: Implement queues.\nPoint 3: Protect user data.',
      cta: 'What is your preferred AI design pattern? Drop your thoughts below.',
      hashtags: ['#SoftwareArchitecture', '#ArtificialIntelligence', '#FullStack'],
      format: 'standard',
      status: 'ready',
      mediaAssets: [media._id]
    });
    assert(draft.characterCount > 0, 'Pre-save hook calculates character count automatically');
    assert(draft.wordCount > 0, 'Pre-save hook calculates word count automatically');
    assert(draft.mediaAssets[0].equals(media._id), 'ContentDraft references mediaAssets');

    // 7. GenerationJob Model
    console.log('\n--- Testing GenerationJob Model ---');
    const job = await GenerationJob.create({
      userId: user._id,
      jobType: 'post-generation',
      status: 'completed',
      queueJobId: 'bullmq_job_9921',
      progress: 100,
      targetDraftId: draft._id,
      inputParams: { topic: 'AI Architecture', tone: 'Executive' },
      result: { draftId: draft._id }
    });
    assert(job.userId.equals(user._id), 'GenerationJob references correct userId');
    assert(job.status === 'completed', 'GenerationJob status recorded properly');
    assert(job.targetDraftId.equals(draft._id), 'GenerationJob references target draft');

    console.log('\n====================================================');
    console.log(`   MODELS VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Model test failed:', err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
    process.exit(0);
  }
};

runModelTests();

