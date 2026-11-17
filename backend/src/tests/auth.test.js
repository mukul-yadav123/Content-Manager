import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { WritingProfile } from '../models/WritingProfile.js';

let mongod;

const runTests = async () => {
  console.log('====================================================');
  console.log('   STARTING AUTHENTICATION & DATABASE API TESTS     ');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failedCount++;
    }
  };

  try {
    // 1. Initialize In-Memory MongoDB Server
    console.log('[Setup] Spinning up In-Memory MongoDB instance...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('[Setup] Connected to in-memory MongoDB successfully.\n');

    // Test Data
    const testUser = {
      name: 'Sarah Connor',
      email: 'sarah.connor@cyberdyne.io',
      password: 'SecurePassword123!',
      headline: 'Director of AI Defense Systems'
    };

    let authToken = '';
    let authCookie = '';

    // ==========================================
    // TEST 1: POST /api/auth/register (Success)
    // ==========================================
    console.log('--- Test Group 1: Registration ---');
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    assert(registerRes.status === 201, 'POST /api/auth/register returns HTTP 201 Created');
    assert(registerRes.body.success === true, 'Response body contains success: true');
    assert(registerRes.body.data.user.email === testUser.email, 'Returns correct user email');
    assert(registerRes.body.data.user.name === testUser.name, 'Returns correct user name');
    assert(!registerRes.body.data.user.password, 'Password hash is excluded from response');
    assert(Boolean(registerRes.body.data.token), 'JWT token returned in response body');

    authToken = registerRes.body.data.token;

    // Check Set-Cookie header
    const cookies = registerRes.headers['set-cookie'];
    assert(Boolean(cookies && cookies.some((c) => c.startsWith('token='))), 'Sets httpOnly token cookie');
    if (cookies) {
      authCookie = cookies.find((c) => c.startsWith('token='));
    }

    // Verify Password was hashed with bcrypt in database
    const dbUser = await User.findOne({ email: testUser.email }).select('+password');
    assert(dbUser.password !== testUser.password, 'Password is encrypted and not plain-text');
    assert(dbUser.password.startsWith('$2'), 'Password hash uses bcrypt ($2a or $2b)');

    // Verify default WritingProfile was automatically created
    const profile = await WritingProfile.findOne({ userId: dbUser._id });
    assert(Boolean(profile), 'Default WritingProfile provisioned automatically for new user');
    assert(profile?.isDefault === true, 'WritingProfile is flagged as default');

    // ==========================================
    // TEST 2: POST /api/auth/register (Duplicate Email)
    // ==========================================
    const dupRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    assert(dupRes.status === 400, 'POST /api/auth/register rejects duplicate email with HTTP 400');
    assert(dupRes.body.success === false, 'Duplicate registration returns success: false');

    // ==========================================
    // TEST 3: POST /api/auth/register (Validation Error)
    // ==========================================
    const invalidRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'A', // too short (< 2)
        email: 'not-an-email',
        password: '123' // too short (< 6)
      });

    assert(invalidRes.status === 400, 'Rejects invalid fields with HTTP 400 Validation Error');
    assert(invalidRes.body.errors && invalidRes.body.errors.length >= 3, 'Returns detailed field error issues');

    // ==========================================
    // TEST 4: POST /api/auth/login (Success)
    // ==========================================
    console.log('\n--- Test Group 2: Login ---');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    assert(loginRes.status === 200, 'POST /api/auth/login returns HTTP 200 OK');
    assert(loginRes.body.success === true, 'Login returns success: true');
    assert(Boolean(loginRes.body.data.token), 'Login returns active JWT token');
    assert(loginRes.body.data.user.email === testUser.email, 'Login returns user object');

    // ==========================================
    // TEST 5: POST /api/auth/login (Wrong Password)
    // ==========================================
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'IncorrectPassword999!'
      });

    assert(wrongPassRes.status === 401, 'POST /api/auth/login rejects wrong password with HTTP 401');
    assert(wrongPassRes.body.success === false, 'Wrong password returns success: false');

    // ==========================================
    // TEST 6: POST /api/auth/login (Non-existent Email)
    // ==========================================
    const nonExistentRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ghost@nonexistent.org',
        password: 'AnyPassword123!'
      });

    assert(nonExistentRes.status === 401, 'Rejects non-existent email with HTTP 401');

    // ==========================================
    // TEST 7: GET /api/auth/me (Protected Route with Bearer Token)
    // ==========================================
    console.log('\n--- Test Group 3: Protected Profile (GET /api/auth/me) ---');
    const meBearerRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert(meBearerRes.status === 200, 'GET /api/auth/me with Bearer token returns HTTP 200');
    assert(meBearerRes.body.data.user.email === testUser.email, 'Returns profile of authenticated user');
    assert(meBearerRes.body.data.user.headline === testUser.headline, 'Returns correct user headline');

    // ==========================================
    // TEST 8: GET /api/auth/me (Protected Route with Cookie)
    // ==========================================
    const meCookieRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    assert(meCookieRes.status === 200, 'GET /api/auth/me with httpOnly cookie returns HTTP 200');
    assert(meCookieRes.body.data.user.name === testUser.name, 'Returns correct user via cookie');

    // ==========================================
    // TEST 9: GET /api/auth/me (Unauthenticated)
    // ==========================================
    const unauthRes = await request(app).get('/api/auth/me');
    assert(unauthRes.status === 401, 'GET /api/auth/me without token returns HTTP 401 Unauthorized');

    // ==========================================
    // TEST 10: POST /api/auth/logout
    // ==========================================
    console.log('\n--- Test Group 4: Logout ---');
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);

    assert(logoutRes.status === 200, 'POST /api/auth/logout returns HTTP 200 OK');
    const logoutCookies = logoutRes.headers['set-cookie'];
    assert(
      Boolean(logoutCookies && logoutCookies.some((c) => c.includes('token=;') || c.includes('Max-Age=0'))),
      'Logout clears the authentication cookie'
    );

    console.log('\n====================================================');
    console.log(`   TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled test suite failure:', err);
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

runTests();

