import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Topic } from '../models/Topic.js';
import { NewsArticle } from '../models/NewsArticle.js';
import ContentDraft from '../models/ContentDraft.js';
import WritingProfile from '../models/WritingProfile.js';
import { analyzeWritingSamples } from '../services/ai/writingProfileAnalysis.service.js';
import { humanizeDraft, evaluatePostQuality } from '../services/ai/humanization.service.js';
import { extractEditDeltas, synthesizeSuggestionsFromEdits } from '../services/ai/editLearning.service.js';

let mongod;

const runHumanizationTests = async () => {
  console.log('====================================================');
  console.log('  STARTING WRITING PROFILE & HUMANIZATION TESTS     ');
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
    await WritingProfile.init();

    // -------------------------------------------------------------
    // Test Group 1: Part A - Writing Sample Analysis Service
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Writing Profile Sample Analysis (12 Dimensions) ---');

    const samplePosts = [
      'Most engineering teams overcomplicate their AI pipelines before validating basic unit economics.\n\nThree months ago, we audited a system spending $40k/mo on frontier LLMs. Replacing 80% of calls with small fine-tuned models cut latency by 60% and costs by 75%.\n\n• Start with the smallest model that passes evals\n• Cache deterministic responses\n• Never optimize latency before cost predictability\n\nThe real tradeoff is developer velocity vs raw accuracy.',
      'A common misconception in startup growth:\n\nHiring senior leaders too early solves execution friction.\n\nIn reality, until product-market fit is proven, senior executives often build infrastructure for scale you do not yet need. Focus on builders who love the mud.',
      'Why we stopped running daily standups:\n\n1. Async updates preserve deep work blocks\n2. Blockers are surfaced in real-time on Slack rather than waiting 24 hours\n3. Written context creates permanent organizational memory\n\nCulture is what happens when you remove performative rituals.'
    ];

    const analysisResult = await analyzeWritingSamples({
      samples: samplePosts,
      customInstructions: 'Avoid buzzwords like game-changer. Never use excessive exclamation marks.',
      preferredStyle: 'authoritative'
    });

    assert(typeof analysisResult.toneOfVoice === 'string' && analysisResult.toneOfVoice.length > 10, '1. Extracts toneOfVoice');
    assert(analysisResult.vocabularyComplexity?.level && ['simple', 'moderate', 'advanced'].includes(analysisResult.vocabularyComplexity.level), '2. Extracts vocabularyComplexity level');
    assert(typeof analysisResult.sentenceLength?.averageWords === 'number', '3. Extracts sentenceLength averageWords');
    assert(typeof analysisResult.paragraphLength?.averageSentences === 'number', '4. Extracts paragraphLength averageSentences');
    assert(Array.isArray(analysisResult.hookPatterns) && analysisResult.hookPatterns.length >= 1, '5. Extracts hookPatterns array');
    assert(typeof analysisResult.storytellingPreferences === 'string', '6. Extracts storytellingPreferences');
    assert(analysisResult.useOfPersonalOpinions?.level && ['frequent', 'balanced', 'fact-anchored'].includes(analysisResult.useOfPersonalOpinions.level), '7. Extracts useOfPersonalOpinions level');
    assert(analysisResult.emojiFrequency && ['none', 'minimal', 'moderate', 'expressive'].includes(analysisResult.emojiFrequency), '8. Extracts emojiFrequency');
    assert(analysisResult.hashtagUsage?.frequency, '9. Extracts hashtagUsage');
    assert(analysisResult.formattingHabits?.bulletStyle, '10. Extracts formattingHabits bulletStyle');
    assert(Array.isArray(analysisResult.commonExpressions) && analysisResult.commonExpressions.length >= 1, '11. Extracts commonExpressions');
    assert(Array.isArray(analysisResult.phrasesToAvoid) && analysisResult.phrasesToAvoid.length >= 1, '12. Extracts phrasesToAvoid');
    assert(analysisResult.analysisMetadata?.sampleCount === 3, 'Records sampleCount in analysisMetadata');

    // -------------------------------------------------------------
    // Test Group 2: Part B & C - AI Humanization & Quality Evaluation
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: AI Humanization Service & Quality Scoring ---');

    const rawDraft = {
      hook: 'In today fast-paced world, this AI milestone is a total game-changer that will disrupt everything forever.',
      body: 'Delve into the tapestry of innovations. Anthropic released Claude 3.7 Sonnet with hybrid reasoning capabilities. The model scored 70.3% on SWE-bench Verified coding evaluation and supports up to 128,000 thinking tokens.\n\n• Key feature: Hybrid thinking mode\n• Benchmark score: 70.3%\n\nLet that sink in! Are you ready for this paradigm shift? Agree?',
      cta: 'Thoughts? Agree? Comment below!',
      hashtags: ['#AI', '#GameChanger', '#Future']
    };

    const originalResearch = {
      mainEvent: 'Anthropic released Claude 3.7 Sonnet with hybrid reasoning.',
      confirmedClaims: ['Claude 3.7 Sonnet introduces hybrid thinking capabilities.'],
      importantNumbers: [
        '70.3% SWE-bench score',
        '128,000 thinking tokens'
      ]
    };

    // Test Natural Professional Mode
    const profHumanized = await humanizeDraft({
      rawDraft,
      originalResearch,
      writingProfile: analysisResult,
      mode: 'professional',
      contentAngle: 'Developer productivity'
    });

    assert(profHumanized.humanizedPost.hook.length > 5, 'Humanized hook is generated');
    assert(!profHumanized.humanizedPost.hook.toLowerCase().includes('game-changer'), 'Humanized hook strips "game-changer" cliché');
    assert(!profHumanized.humanizedPost.body.toLowerCase().includes('let that sink in'), 'Humanized body strips "let that sink in"');
    assert(!profHumanized.humanizedPost.body.toLowerCase().includes('delve'), 'Humanized body strips "delve"');
    assert(profHumanized.humanizedPost.body.includes('70.3%') || profHumanized.humanizedPost.body.includes('Claude 3.7'), 'Humanized body preserves verified numbers/facts');

    // Test Quality Evaluation
    const quality = profHumanized.qualityEvaluation;
    assert(typeof quality.naturalnessScore === 'number' && quality.naturalnessScore >= 70, 'Calculates naturalnessScore (>=70)');
    assert(typeof quality.profileConsistencyScore === 'number' && quality.profileConsistencyScore >= 70, 'Calculates profileConsistencyScore (>=70)');
    assert(typeof quality.clarityScore === 'number' && quality.clarityScore >= 70, 'Calculates clarityScore (>=70)');
    assert(typeof quality.engagementPotentialScore === 'number', 'Calculates engagementPotentialScore');
    assert(typeof quality.factualConsistencyScore === 'number' && quality.factualConsistencyScore >= 80, 'Calculates factualConsistencyScore (>=80)');
    assert(Array.isArray(quality.genericFillerDetected), 'Returns genericFillerDetected array');
    assert(typeof quality.overallQualityScore === 'number', 'Calculates overallQualityScore');

    // Test Light and Conversational Modes
    const lightHumanized = await humanizeDraft({
      rawDraft,
      originalResearch,
      writingProfile: analysisResult,
      mode: 'light'
    });
    assert(lightHumanized.humanizedPost.body.length > 50, 'Light humanization mode completes successfully');

    const convHumanized = await humanizeDraft({
      rawDraft,
      originalResearch,
      writingProfile: analysisResult,
      mode: 'conversational'
    });
    assert(convHumanized.humanizedPost.hook.length > 5, 'Conversational humanization mode completes successfully');

    // -------------------------------------------------------------
    // Test Group 3: Part D - Edit Learning & Diff Extraction
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Edit Learning & Non-Destructive Suggestions ---');

    const editedPost = {
      hook: 'Claude 3.7 Sonnet is out:',
      body: 'Anthropic launched Claude 3.7 Sonnet today.\n\n- Hybrid reasoning architecture\n- 70.3% score on SWE-bench\n- 128k token reasoning budget\n\nThe real test will be cost predictability at scale.',
      cta: 'Where is your team testing reasoning models?',
      hashtags: ['#AI', '#Engineering']
    };

    const deltas = extractEditDeltas({
      original: rawDraft,
      edited: editedPost
    });

    assert(deltas.length >= 1, 'Extracts edit differences between drafts');
    assert(deltas.some((d) => d.type === 'hook_length'), 'Detects hook shortening delta');

    // -------------------------------------------------------------
    // Test Group 4: End-to-End API Workflows & Versioning
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: Full API Integration & Profile Workflow ---');

    // 4.1 Register User A & User B
    const regResA = await request(app).post('/api/auth/register').send({
      name: 'Humanize User A',
      email: 'humanize.a@example.com',
      password: 'Password123!'
    });
    const tokenA = regResA.body.data.token;
    const userA = regResA.body.data.user;

    const regResB = await request(app).post('/api/auth/register').send({
      name: 'Humanize User B',
      email: 'humanize.b@example.com',
      password: 'Password123!'
    });
    const tokenB = regResB.body.data.token;

    // 4.2 GET /api/profile
    const getProfRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(getProfRes.status === 200, 'GET /api/profile returns 200 OK');
    assert(getProfRes.body.data.profileName === 'Default Voice', 'Retrieves default writing profile');

    // 4.3 POST /api/profile/analyze
    const analyzeApiRes = await request(app)
      .post('/api/profile/analyze')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        samples: samplePosts,
        customInstructions: 'Keep hooks under 80 characters.',
        preferredStyle: 'conversational'
      });

    assert(analyzeApiRes.status === 200, 'POST /api/profile/analyze returns 200 OK');
    assert(analyzeApiRes.body.data.toneOfVoice, 'Saves extracted toneOfVoice in MongoDB profile');
    assert(analyzeApiRes.body.data.samplePosts.length === 3, 'Persists sample posts in profile');

    // 4.4 PUT /api/profile
    const updateProfRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        tone: 'Crisp, conversational executive voice',
        preferredStyle: 'conversational'
      });

    assert(updateProfRes.status === 200, 'PUT /api/profile returns 200 OK');
    assert(updateProfRes.body.data.tone === 'Crisp, conversational executive voice', 'Updates profile fields manually');

    // 4.5 POST /api/profile/samples
    const addSampleRes = await request(app)
      .post('/api/profile/samples')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sample: 'New sample post demonstrating how we manage remote engineering sprints without burnout.'
      });

    assert(addSampleRes.status === 200, 'POST /api/profile/samples adds sample post');

    // 4.6 Create a News Article & Generate Draft for Humanization
    const topic = await Topic.create({
      userId: userA._id,
      name: 'Artificial Intelligence',
      category: 'Artificial Intelligence',
      keywords: ['Anthropic', 'Claude']
    });

    const article = await NewsArticle.create({
      userId: userA._id,
      topicId: topic._id,
      title: 'Anthropic releases Claude 3.7 Sonnet with hybrid reasoning mode',
      sourceUrl: 'https://anthropic.com/news/claude-3-7',
      publisher: 'Anthropic',
      publishedAt: new Date(),
      discoveredAt: new Date(),
      summary: 'Anthropic launched Claude 3.7 Sonnet combining standard and thinking models.',
      status: 'shortlisted',
      deepResearch: originalResearch
    });

    const genRes = await request(app)
      .post('/api/studio/generate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        articleId: article._id.toString(),
        targetAudience: 'Engineering Leaders',
        contentAngle: 'Developer productivity'
      });

    const draftId = genRes.body.data._id;
    assert(genRes.body.data.initialDraft.body.length > 0, 'Draft maintains initialDraft');
    assert(genRes.body.data.versions.length === 1, 'Draft initializes versions array with initial AI draft');

    // 4.7 POST /api/studio/drafts/:id/humanize
    const humanizeRes = await request(app)
      .post(`/api/studio/drafts/${draftId}/humanize`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        mode: 'professional'
      });

    assert(humanizeRes.status === 200, 'POST /api/studio/drafts/:id/humanize returns 200 OK');
    assert(humanizeRes.body.data.draft.isHumanized === true, 'Sets isHumanized: true');
    assert(humanizeRes.body.data.draft.humanizedDraft.body.length > 0, 'Stores humanizedDraft subdocument');
    assert(humanizeRes.body.data.draft.initialDraft.body.length > 0, 'Preserves initialDraft intact');
    assert(humanizeRes.body.data.draft.versions.length === 2, 'Pushes humanized version into versions array');
    assert(humanizeRes.body.data.qualityEvaluation.overallQualityScore >= 70, 'Returns qualityEvaluation with score');

    // Multi-tenant check: User B cannot humanize User A's draft
    const humanizeResB = await request(app)
      .post(`/api/studio/drafts/${draftId}/humanize`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ mode: 'professional' });
    assert(humanizeResB.status === 404, 'Prevents User B from humanizing User A draft');

    // 4.8 PUT /api/studio/drafts/:id (User manual edit)
    const editDraftRes = await request(app)
      .put(`/api/studio/drafts/${draftId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hook: 'Claude 3.7 Sonnet is here:',
        body: 'Anthropic launched Claude 3.7 Sonnet with hybrid reasoning.\n\n- 70.3% SWE-bench score\n- 128k thinking tokens\n\nPragmatic execution wins.'
      });

    assert(editDraftRes.status === 200, 'PUT /api/studio/drafts/:id saves manual edit');
    assert(editDraftRes.body.data.userEditedDraft.body.length > 0, 'Stores userEditedDraft subdocument');
    assert(editDraftRes.body.data.versions.length === 3, 'Pushes user_edited version into versions array');

    // 4.9 POST /api/studio/drafts/:id/approve (Final Approved Draft & Edit Learning)
    const approveRes = await request(app)
      .post(`/api/studio/drafts/${draftId}/approve`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert(approveRes.status === 200, 'POST /api/studio/drafts/:id/approve returns 200 OK');
    assert(approveRes.body.data.draft.finalApprovedDraft.body.length > 0, 'Stores finalApprovedDraft subdocument');
    assert(approveRes.body.data.draft.status === 'ready', 'Marks draft status as ready');
    assert(approveRes.body.data.draft.versions.length === 4, 'All 4 required draft versions tracked in versions array');

    // Check that non-destructive suggestions were synthesized
    const profWithSuggestions = await WritingProfile.findOne({ userId: userA._id, isDefault: true });
    assert(Array.isArray(profWithSuggestions.learnedSuggestions), 'Profile has learnedSuggestions array');
    assert(profWithSuggestions.learnedSuggestions.length >= 1, 'Synthesizes at least 1 suggestion from repeated user edits');
    assert(profWithSuggestions.learnedSuggestions[0].status === 'pending', 'Suggestion is marked pending and not silently applied');

    const suggestionId = profWithSuggestions.learnedSuggestions[0]._id;

    // 4.10 POST /api/profile/suggestions/:id (Accept Suggestion)
    const acceptRes = await request(app)
      .post(`/api/profile/suggestions/${suggestionId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ action: 'accept' });

    assert(acceptRes.status === 200, 'POST /api/profile/suggestions/:id with accept returns 200 OK');
    const acceptedSuggestion = acceptRes.body.data.learnedSuggestions.find((s) => s._id.toString() === suggestionId.toString());
    assert(acceptedSuggestion.status === 'accepted', 'Marks suggestion status as accepted after explicit user consent');

    // 4.11 PATCH /api/studio/drafts/:id/revert-version
    const revertRes = await request(app)
      .patch(`/api/studio/drafts/${draftId}/revert-version`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ versionType: 'initial' });

    assert(revertRes.status === 200, 'PATCH /api/studio/drafts/:id/revert-version returns 200 OK');
    assert(revertRes.body.data.body === genRes.body.data.initialDraft.body, 'Successfully reverts active post to initial draft');

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

runHumanizationTests();

