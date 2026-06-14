const request = require('supertest');
const { createApp } = require('../src/index');
const { Course } = require('../src/models/Course');
const { Category } = require('../src/models/Category');
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
    it('should list only published courses', async () => {
      const category = await createCategory();
      await Course.create([
        {
          ...createCoursePayload(category.categoryId),
          slug: 'published-course',
          isPublished: true,
        },
        {
          ...createCoursePayload(category.categoryId),
          title: 'Draft Course',
          slug: 'draft-course',
          isPublished: false,
        },
      ]);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.data.courses).toHaveLength(1);
      expect(res.body.data.courses[0].slug).toBe('published-course');
      expect(res.body.data.courses[0].moduleCount).toBe(0);
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
});
