const request = require('supertest');
const { createApp } = require('../src/index');
const { UserProfile } = require('../src/models/UserProfile');
const { ROLES } = require('@eduelderly/shared/constants/roles');

const app = createApp();
const SERVICE_KEY = 'test_internal_key';

const learnerHeaders = {
  'x-user-id': 'learner-001',
  'x-user-role': ROLES.LEARNER,
};

const adminHeaders = {
  'x-user-id': 'admin-001',
  'x-user-role': ROLES.ADMIN,
};

const createProfile = (overrides = {}) => UserProfile.create({
  userId: 'learner-001',
  name: 'Test Learner',
  email: 'learner@test.com',
  role: ROLES.LEARNER,
  ...overrides,
});

describe('User Service', () => {
  describe('POST /internal/profile', () => {
    it('should create a profile with valid service key', async () => {
      const res = await request(app)
        .post('/internal/profile')
        .set('X-Service-Key', SERVICE_KEY)
        .send({
          userId: 'user-new-1',
          name: 'New User',
          email: 'new@test.com',
          role: ROLES.LEARNER,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('user-new-1');
      expect(res.body.data.email).toBe('new@test.com');
    });

    it('should return existing profile idempotently', async () => {
      await createProfile({ userId: 'user-dup-1', email: 'dup@test.com' });

      const res = await request(app)
        .post('/internal/profile')
        .set('X-Service-Key', SERVICE_KEY)
        .send({
          userId: 'user-dup-1',
          name: 'Duplicate',
          email: 'dup@test.com',
          role: ROLES.LEARNER,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('user-dup-1');
    });

    it('should reject requests without service key', async () => {
      const res = await request(app)
        .post('/internal/profile')
        .send({ userId: 'user-no-key' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing userId', async () => {
      const res = await request(app)
        .post('/internal/profile')
        .set('X-Service-Key', SERVICE_KEY)
        .send({ name: 'No Id' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing name and email', async () => {
      const res = await request(app)
        .post('/internal/profile')
        .set('X-Service-Key', SERVICE_KEY)
        .send({ userId: 'incomplete-user' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', async () => {
      const res = await request(app)
        .post('/internal/profile')
        .set('X-Service-Key', SERVICE_KEY)
        .send({
          userId: 'short-name',
          name: 'A',
          email: 'short@test.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /profile', () => {
    it('should return the authenticated user profile', async () => {
      await createProfile();

      const res = await request(app)
        .get('/profile')
        .set(learnerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('learner-001');
      expect(res.body.data.fontSizePref).toBe('large');
    });

    it('should return 401 without user context headers', async () => {
      const res = await request(app).get('/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when profile does not exist', async () => {
      const res = await request(app)
        .get('/profile')
        .set({ 'x-user-id': 'missing-user', 'x-user-role': ROLES.LEARNER });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /profile', () => {
    beforeEach(() => createProfile());

    it('should update allowed profile fields', async () => {
      const res = await request(app)
        .put('/profile')
        .set(learnerHeaders)
        .send({
          fontSizePref: 'xl',
          highContrast: true,
          bio: 'Hello world',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fontSizePref).toBe('xl');
      expect(res.body.data.highContrast).toBe(true);
      expect(res.body.data.bio).toBe('Hello world');
    });

    it('should reject empty update body', async () => {
      const res = await request(app)
        .put('/profile')
        .set(learnerHeaders)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid fontSizePref', async () => {
      const res = await request(app)
        .put('/profile')
        .set(learnerHeaders)
        .send({ fontSizePref: 'tiny' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET / (admin list)', () => {
    it('should return paginated users for admin', async () => {
      await UserProfile.create([
        { userId: 'u1', name: 'Alice', email: 'alice@test.com', role: ROLES.LEARNER },
        { userId: 'u2', name: 'Bob', email: 'bob@test.com', role: ROLES.LEARNER },
        { userId: 'u3', name: 'Carol', email: 'carol@test.com', role: ROLES.ADMIN },
      ]);

      const res = await request(app)
        .get('/?page=1&limit=2')
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
    });

    it('should return 403 for learner', async () => {
      const res = await request(app)
        .get('/')
        .set(learnerHeaders);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /:userId (admin)', () => {
    it('should return a user by id for admin', async () => {
      await createProfile({ userId: 'target-user', email: 'target@test.com' });

      const res = await request(app)
        .get('/target-user')
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.userId).toBe('target-user');
    });

    it('should return 403 for learner', async () => {
      const res = await request(app)
        .get('/learner-001')
        .set(learnerHeaders);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /internal/sync', () => {
    it('should sync name and email from auth', async () => {
      await createProfile({ userId: 'sync-user', name: 'Old Name', email: 'old@test.com' });

      const res = await request(app)
        .patch('/internal/sync')
        .set('X-Service-Key', SERVICE_KEY)
        .send({
          userId: 'sync-user',
          name: 'New Name',
          email: 'newemail@test.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.email).toBe('newemail@test.com');
    });

    it('should sync isActive from auth', async () => {
      await createProfile({ userId: 'suspend-user', isActive: true });

      const res = await request(app)
        .patch('/internal/sync')
        .set('X-Service-Key', SERVICE_KEY)
        .send({
          userId: 'suspend-user',
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('should reject sync without updatable fields', async () => {
      await createProfile({ userId: 'no-sync-fields' });

      const res = await request(app)
        .patch('/internal/sync')
        .set('X-Service-Key', SERVICE_KEY)
        .send({ userId: 'no-sync-fields' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /internal/:userId/xp', () => {
    it('should increment totalXP', async () => {
      await createProfile({ userId: 'xp-user', totalXP: 10 });

      const res = await request(app)
        .patch('/internal/xp-user/xp')
        .set('X-Service-Key', SERVICE_KEY)
        .send({ amount: 25 });

      expect(res.status).toBe(200);
      expect(res.body.data.totalXP).toBe(35);
    });

    it('should reject XP that would go negative', async () => {
      await createProfile({ userId: 'xp-low', totalXP: 5 });

      const res = await request(app)
        .patch('/internal/xp-low/xp')
        .set('X-Service-Key', SERVICE_KEY)
        .send({ amount: -10 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
