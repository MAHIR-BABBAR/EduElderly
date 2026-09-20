/**
 * Catalog cache test. Runs only when Redis is reachable (REDIS_URL set), as in
 * CI. Verifies HIT/MISS headers and write-through invalidation.
 */
const request = require('supertest');
const { ROLES } = require('@eduelderly/shared/constants/roles');
const { Category } = require('../src/models/Category');

const REDIS_URL = process.env.TEST_REDIS_URL || process.env.REDIS_URL;
const describeIfRedis = REDIS_URL ? describe : describe.skip;

const adminHeaders = { 'x-user-id': 'admin-1', 'x-user-role': ROLES.ADMIN };

describeIfRedis('Catalog cache (Redis)', () => {
  let app;
  let cache;

  beforeAll(async () => {
    process.env.REDIS_URL = REDIS_URL;
    process.env.CACHE_ENABLED = 'true';
    process.env.CACHE_KEY_PREFIX = `test-${Date.now()}:`;
    cache = require('@eduelderly/shared/cache');
    const { createApp } = require('../src/index');
    app = createApp();
  });

  afterAll(async () => {
    await cache.invalidatePrefix('');
    await cache.closeCache();
    delete process.env.CACHE_ENABLED;
    delete process.env.CACHE_KEY_PREFIX;
  });

  const createPublishedCourse = async (title) => {
    const category = await Category.findOne({ slug: 'cache-cat' })
      || await Category.create({ name: 'Cache cat', slug: 'cache-cat', description: '' });
    const created = await request(app)
      .post('/')
      .set(adminHeaders)
      .send({ title, categoryId: category.categoryId, instructorName: 'Dr. Cache' });
    await request(app)
      .patch(`/${created.body.data.courseId}/publish`)
      .set(adminHeaders)
      .send({ isPublished: true });
    return created.body.data.courseId;
  };

  it('serves the catalog from cache on the second read and invalidates on write', async () => {
    await createPublishedCourse('Cached course A');

    const first = await request(app).get('/');
    expect(first.status).toBe(200);
    expect(first.headers['x-cache']).toBe('MISS');
    expect(first.body.data.courses).toHaveLength(1);

    const second = await request(app).get('/');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);

    await createPublishedCourse('Cached course B');

    const afterWrite = await request(app).get('/');
    expect(afterWrite.headers['x-cache']).toBe('MISS');
    expect(afterWrite.body.data.courses).toHaveLength(2);
  });

  it('caches course detail and drops it when a topic changes', async () => {
    const courseId = await createPublishedCourse('Cached detail');

    const first = await request(app).get(`/${courseId}`);
    expect(first.headers['x-cache']).toBe('MISS');
    const second = await request(app).get(`/${courseId}`);
    expect(second.headers['x-cache']).toBe('HIT');

    const mod = await request(app)
      .post(`/${courseId}/modules`)
      .set(adminHeaders)
      .send({ title: 'M1', order: 0 });
    expect(mod.status).toBe(201);

    const afterWrite = await request(app).get(`/${courseId}`);
    expect(afterWrite.headers['x-cache']).toBe('MISS');
    expect(afterWrite.body.data.modules).toHaveLength(1);
  });
});
