const request = require('supertest');
const { createApp } = require('../src/index');
const { Enrollment } = require('../src/models/Enrollment');
const { ROLES } = require('@eduelderly/shared/constants/roles');
const courseClient = require('../src/clients/courseClient');
const userClient = require('../src/clients/userClient');
const paymentClient = require('../src/clients/paymentClient');

const app = createApp();

const learnerHeaders = {
  'x-user-id': 'learner-1',
  'x-user-role': ROLES.LEARNER,
};

const otherLearnerHeaders = {
  'x-user-id': 'learner-2',
  'x-user-role': ROLES.LEARNER,
};

const serviceHeaders = {
  'x-service-key': 'test_internal_key',
};

const freeCourse = {
  courseId: 'course-free-1',
  title: 'Free Wellness',
  isPublished: true,
  isDeleted: false,
  isPaid: false,
  price: 0,
  topicCount: 2,
  topicIds: ['topic-1', 'topic-2'],
  modules: [
    { moduleId: 'mod-1', topicIds: ['topic-1', 'topic-2'] },
  ],
};

const paidCourse = {
  ...freeCourse,
  courseId: 'course-paid-1',
  isPaid: true,
  price: 499,
};

describe('Enrollment Service', () => {
  beforeEach(() => {
    courseClient.getCourse.mockResolvedValue(freeCourse);
    courseClient.getCourseStats.mockResolvedValue(freeCourse);
    courseClient.getTopic.mockImplementation(async (topicId) => ({
      topicId,
      moduleId: 'mod-1',
      courseId: freeCourse.courseId,
      title: 'Lesson',
      contentType: 'video',
      contentUrl: 'https://example.com/video',
      durationMinutes: 5,
    }));
    userClient.incrementXP.mockResolvedValue({ success: true });
    paymentClient.initiateCheckout.mockResolvedValue({
      orderId: 'order-1',
      checkoutUrl: 'https://pay.example/checkout',
    });
  });

  describe('POST /', () => {
    it('should create enrollment for free course', async () => {
      const res = await request(app)
        .post('/')
        .set(learnerHeaders)
        .send({ courseId: freeCourse.courseId });

      expect(res.status).toBe(201);
      expect(res.body.data.courseId).toBe(freeCourse.courseId);
      expect(res.body.data.status).toBe('active');
    });

    it('should return 409 when already enrolled', async () => {
      await Enrollment.create({
        userId: 'learner-1',
        courseId: freeCourse.courseId,
        status: 'active',
      });

      const res = await request(app)
        .post('/')
        .set(learnerHeaders)
        .send({ courseId: freeCourse.courseId });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('E_ALREADY_ENROLLED');
    });

    it('should delegate paid course to payment service', async () => {
      courseClient.getCourse.mockResolvedValue(paidCourse);

      const res = await request(app)
        .post('/')
        .set(learnerHeaders)
        .send({ courseId: paidCourse.courseId });

      expect(res.status).toBe(202);
      expect(res.body.data.requiresPayment).toBe(true);
      expect(res.body.data.checkout.orderId).toBe('order-1');
      expect(paymentClient.initiateCheckout).toHaveBeenCalledWith({
        userId: 'learner-1',
        courseId: paidCourse.courseId,
        amount: 499,
      });
      expect(await Enrollment.countDocuments()).toBe(0);
    });

    it('should return 503 when payment service is unavailable', async () => {
      courseClient.getCourse.mockResolvedValue(paidCourse);
      paymentClient.initiateCheckout.mockRejectedValue(
        Object.assign(new Error('down'), { statusCode: 503 }),
      );
      const { AppError, ERROR_CODES } = require('@eduelderly/shared');
      paymentClient.initiateCheckout.mockRejectedValue(
        new AppError('Payment service unavailable', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE),
      );

      const res = await request(app)
        .post('/')
        .set(learnerHeaders)
        .send({ courseId: paidCourse.courseId });

      expect(res.status).toBe(503);
    });
  });

  describe('GET /', () => {
    it('should list enrollments for current user only', async () => {
      await Enrollment.create({ userId: 'learner-1', courseId: 'c1', status: 'active' });
      await Enrollment.create({ userId: 'learner-2', courseId: 'c2', status: 'active' });

      const res = await request(app).get('/').set(learnerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.enrollments).toHaveLength(1);
      expect(res.body.data.enrollments[0].courseId).toBe('c1');
    });
  });

  describe('GET /:enrollmentId', () => {
    it('should forbid access to another user enrollment', async () => {
      const enrollment = await Enrollment.create({
        userId: 'learner-2',
        courseId: freeCourse.courseId,
        status: 'active',
      });

      const res = await request(app)
        .get(`/${enrollment.enrollmentId}`)
        .set(learnerHeaders);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /:enrollmentId/progress', () => {
    it('should update progress and award XP', async () => {
      const enrollment = await Enrollment.create({
        userId: 'learner-1',
        courseId: freeCourse.courseId,
        status: 'active',
      });

      const res = await request(app)
        .patch(`/${enrollment.enrollmentId}/progress`)
        .set(learnerHeaders)
        .send({ topicId: 'topic-1', timeSpentMinutes: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.completedTopics).toContain('topic-1');
      expect(res.body.data.progressPercent).toBe(50);
      expect(userClient.incrementXP).toHaveBeenCalledWith('learner-1', 10);
    });

    it('should complete course at 100% progress', async () => {
      const enrollment = await Enrollment.create({
        userId: 'learner-1',
        courseId: freeCourse.courseId,
        status: 'active',
        completedTopics: ['topic-1'],
        progressPercent: 50,
      });

      const res = await request(app)
        .patch(`/${enrollment.enrollmentId}/progress`)
        .set(learnerHeaders)
        .send({ topicId: 'topic-2' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.progressPercent).toBe(100);
      expect(userClient.incrementXP).toHaveBeenCalledWith('learner-1', 100);
    });
  });

  describe('GET /:enrollmentId/topics/:topicId/content', () => {
    it('should return content for enrolled user', async () => {
      const enrollment = await Enrollment.create({
        userId: 'learner-1',
        courseId: freeCourse.courseId,
        status: 'active',
      });

      const res = await request(app)
        .get(`/${enrollment.enrollmentId}/topics/topic-1/content`)
        .set(learnerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.contentUrl).toBe('https://example.com/video');
    });

    it('should reject dropped enrollment', async () => {
      const enrollment = await Enrollment.create({
        userId: 'learner-1',
        courseId: freeCourse.courseId,
        status: 'dropped',
      });

      const res = await request(app)
        .get(`/${enrollment.enrollmentId}/topics/topic-1/content`)
        .set(learnerHeaders);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('E_NOT_ENROLLED');
    });
  });

  describe('POST /internal/enroll', () => {
    it('should create enrollment after payment', async () => {
      const res = await request(app)
        .post('/internal/enroll')
        .set(serviceHeaders)
        .send({
          userId: 'learner-1',
          courseId: freeCourse.courseId,
          paymentRef: 'pay-ref-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.paymentRef).toBeUndefined();
      const stored = await Enrollment.findOne({ userId: 'learner-1' });
      expect(stored.paymentRef).toBe('pay-ref-1');
    });
  });

  describe('GET /internal/users/:userId/courses/:courseId', () => {
    it('should return enrollment status', async () => {
      await Enrollment.create({
        userId: 'learner-1',
        courseId: freeCourse.courseId,
        status: 'active',
      });

      const res = await request(app)
        .get(`/internal/users/learner-1/courses/${freeCourse.courseId}`)
        .set(serviceHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.courseId).toBe(freeCourse.courseId);
    });
  });
});
