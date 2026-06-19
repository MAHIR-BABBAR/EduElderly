const request = require('supertest');
const { createApp } = require('../src/index');
const { Course } = require('../src/models/Course');
const { Category } = require('../src/models/Category');
const { Module } = require('../src/models/Module');
const { Topic } = require('../src/models/Topic');
const { ROLES } = require('@eduelderly/shared/constants/roles');

const app = createApp();

const adminHeaders = {
  'x-user-id': 'admin-1',
  'x-user-role': ROLES.ADMIN,
};

const learnerHeaders = {
  'x-user-id': 'learner-1',
  'x-user-role': ROLES.LEARNER,
};

const serviceHeaders = {
  'x-service-key': 'test_internal_key',
};

const createCategory = async () => Category.create({
  name: 'Wellness',
  slug: 'wellness',
  description: 'Health courses',
});

const createCoursePayload = (categoryId) => ({
  title: 'Intro to Wellness',
  description: 'Basics',
  categoryId,
  instructorName: 'Dr. Smith',
  isPaid: false,
  price: 0,
  difficulty: 'beginner',
  estimatedHours: 2,
});

describe('Course Service', () => {
  describe('GET /', () => {
    it('should list only published courses with totalTopics', async () => {
      const category = await createCategory();
      const published = await Course.create({
        ...createCoursePayload(category.categoryId),
        slug: 'published-course',
        isPublished: true,
      });
      await Course.create({
        ...createCoursePayload(category.categoryId),
        title: 'Draft Course',
        slug: 'draft-course',
        isPublished: false,
      });
      const mod = await Module.create({
        courseId: published.courseId,
        title: 'Mod 1',
        order: 0,
        topicIds: [],
      });
      const topic = await Topic.create({
        courseId: published.courseId,
        moduleId: mod.moduleId,
        title: 'Topic 1',
        contentType: 'text',
        contentUrl: 'https://example.com',
        order: 0,
      });
      mod.topicIds = [topic.topicId];
      await mod.save();
      published.moduleIds = [mod.moduleId];
      await published.save();

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.data.courses).toHaveLength(1);
      expect(res.body.data.courses[0].slug).toBe('published-course');
      expect(res.body.data.courses[0].totalTopics).toBe(1);
    });
  });

  describe('GET /:courseId', () => {
    it('should return public DTO with nested modules and topics', async () => {
      const category = await createCategory();
      const course = await Course.create({
        ...createCoursePayload(category.categoryId),
        slug: 'detail-course',
        isPublished: true,
      });
      const mod = await Module.create({
        courseId: course.courseId,
        title: 'Module A',
        order: 0,
        topicIds: [],
      });
      const topic = await Topic.create({
        courseId: course.courseId,
        moduleId: mod.moduleId,
        title: 'Lesson 1',
        contentType: 'text',
        contentUrl: 'https://medlineplus.gov/example',
        order: 0,
      });
      mod.topicIds = [topic.topicId];
      await mod.save();
      course.moduleIds = [mod.moduleId];
      await course.save();

      const res = await request(app).get(`/${course.courseId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.modules).toHaveLength(1);
      expect(res.body.data.modules[0].topics[0].contentUrl).toBeUndefined();
      expect(res.body.data.modules[0].topics[0].title).toBe('Lesson 1');
      expect(res.body.data.totalTopics).toBe(1);
      expect(res.body.data.moduleIds).toBeUndefined();
    });
  });

  describe('GET /admin/courses', () => {
    it('should list drafts for admin', async () => {
      const category = await createCategory();
      await Course.create({
        ...createCoursePayload(category.categoryId),
        slug: 'admin-draft',
        isPublished: false,
      });

      const res = await request(app)
        .get('/admin/courses')
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.courses).toHaveLength(1);
    });

    it('should return 403 for learner', async () => {
      const res = await request(app)
        .get('/admin/courses')
        .set(learnerHeaders);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /', () => {
    it('should allow admin to create a course', async () => {
      const category = await createCategory();

      const res = await request(app)
        .post('/')
        .set(adminHeaders)
        .send(createCoursePayload(category.categoryId));

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Intro to Wellness');
      expect(res.body.data.categoryId).toBe(category.categoryId);
    });

    it('should return 403 for learner', async () => {
      const category = await createCategory();

      const res = await request(app)
        .post('/')
        .set(learnerHeaders)
        .send(createCoursePayload(category.categoryId));

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /:courseId/publish', () => {
    it('should publish a course for admin', async () => {
      const category = await createCategory();
      const course = await Course.create({
        ...createCoursePayload(category.categoryId),
        slug: 'publish-me',
        isPublished: false,
      });

      const res = await request(app)
        .patch(`/${course.courseId}/publish`)
        .set(adminHeaders)
        .send({ isPublished: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(true);

      const listRes = await request(app).get('/');
      expect(listRes.body.data.courses).toHaveLength(1);
    });
  });

  describe('GET /internal/courses/:courseId/stats', () => {
    it('should return topic stats with service key', async () => {
      const category = await createCategory();
      const course = await Course.create({
        ...createCoursePayload(category.categoryId),
        slug: 'internal-stats',
        isPublished: true,
      });
      const mod = await Module.create({
        courseId: course.courseId,
        title: 'M1',
        order: 0,
        topicIds: [],
      });
      const topic = await Topic.create({
        courseId: course.courseId,
        moduleId: mod.moduleId,
        title: 'T1',
        contentType: 'text',
        order: 0,
      });
      mod.topicIds = [topic.topicId];
      await mod.save();

      const res = await request(app)
        .get(`/internal/courses/${course.courseId}/stats`)
        .set(serviceHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.topicCount).toBe(1);
      expect(res.body.data.topicIds).toContain(topic.topicId);
    });

    it('should reject missing service key', async () => {
      const res = await request(app).get('/internal/courses/fake-id/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /internal/topics/:topicId', () => {
    it('should return topic with contentUrl for service key', async () => {
      const category = await createCategory();
      const course = await Course.create({
        ...createCoursePayload(category.categoryId),
        slug: 'internal-topic',
        isPublished: true,
      });
      const mod = await Module.create({
        courseId: course.courseId,
        title: 'M1',
        order: 0,
        topicIds: [],
      });
      const topic = await Topic.create({
        courseId: course.courseId,
        moduleId: mod.moduleId,
        title: 'Gated lesson',
        contentType: 'video',
        contentUrl: 'https://example.com/video',
        order: 0,
      });

      const res = await request(app)
        .get(`/internal/topics/${topic.topicId}`)
        .set(serviceHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.topicId).toBe(topic.topicId);
      expect(res.body.data.contentUrl).toBe('https://example.com/video');
      expect(res.body.data.courseId).toBe(course.courseId);
    });

    it('should reject missing service key', async () => {
      const res = await request(app).get('/internal/topics/fake-topic-id');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /categories/:categoryId', () => {
    it('should block delete when courses exist', async () => {
      const category = await createCategory();
      await Course.create({
        ...createCoursePayload(category.categoryId),
        slug: 'blocks-delete',
        isPublished: true,
      });

      const res = await request(app)
        .delete(`/categories/${category.categoryId}`)
        .set(adminHeaders);

      expect(res.status).toBe(400);
    });
  });
});
