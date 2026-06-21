const request = require('supertest');
const { createApp } = require('../src/index');
const { ROLES } = require('@eduelderly/shared/constants/roles');
const { ENROLLMENT_STATUS } = require('@eduelderly/shared/constants/enrollmentStatus');
const enrollmentClient = require('../src/clients/enrollmentClient');

const app = createApp();

const adminHeaders = {
  'x-user-id': 'admin-1',
  'x-user-role': ROLES.ADMIN,
};

const learnerHeaders = {
  'x-user-id': 'learner-1',
  'x-user-role': ROLES.LEARNER,
};

const otherLearnerHeaders = {
  'x-user-id': 'learner-2',
  'x-user-role': ROLES.LEARNER,
};

const activeEnrollment = {
  enrollmentId: 'enr-1',
  userId: 'learner-1',
  courseId: 'course-1',
  status: ENROLLMENT_STATUS.ACTIVE,
};

const createPublishedQuizWithQuestions = async () => {
  const createRes = await request(app)
    .post('/')
    .set(adminHeaders)
    .send({
      courseId: 'course-1',
      title: 'Wellness Quiz',
      passThreshold: 70,
      maxAttempts: 3,
      isPublished: true,
    });

  const quizId = createRes.body.data.quizId;

  const questions = [
    { prompt: 'Q1', options: ['A', 'B', 'C'], correctIndex: 0, order: 0 },
    { prompt: 'Q2', options: ['A', 'B', 'C'], correctIndex: 1, order: 1 },
    { prompt: 'Q3', options: ['A', 'B', 'C'], correctIndex: 0, order: 2 },
    { prompt: 'Q4', options: ['A', 'B', 'C'], correctIndex: 2, order: 3 },
    { prompt: 'Q5', options: ['A', 'B', 'C'], correctIndex: 0, order: 4 },
  ];

  const questionIds = [];
  for (const q of questions) {
    const res = await request(app)
      .post(`/${quizId}/questions`)
      .set(adminHeaders)
      .send(q);
    questionIds.push(res.body.data.questionId);
  }

  return { quizId, questionIds };
};

describe('Quiz Service', () => {
  beforeEach(() => {
    enrollmentClient.getEnrollment.mockResolvedValue(activeEnrollment);
  });

  describe('POST / — create quiz', () => {
    it('creates a quiz as admin', async () => {
      const res = await request(app)
        .post('/')
        .set(adminHeaders)
        .send({
          courseId: 'course-1',
          title: 'Intro Quiz',
          isPublished: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('quizId');
      expect(res.body.data.title).toBe('Intro Quiz');
      expect(res.body.data.passThreshold).toBe(70);
      expect(res.body.data.maxAttempts).toBe(3);
    });

    it('rejects non-admin', async () => {
      const res = await request(app)
        .post('/')
        .set(learnerHeaders)
        .send({ courseId: 'course-1', title: 'Nope' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /:quizId — fetch quiz', () => {
    it('returns quiz and questions without correctIndex', async () => {
      const { quizId } = await createPublishedQuizWithQuestions();

      const res = await request(app).get(`/${quizId}`).set(learnerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.questions).toHaveLength(5);
      res.body.data.questions.forEach((q) => {
        expect(q).not.toHaveProperty('correctIndex');
        expect(q.options).toHaveLength(3);
      });
    });

    it('returns 404 for unpublished quiz', async () => {
      const createRes = await request(app)
        .post('/')
        .set(adminHeaders)
        .send({ courseId: 'course-1', title: 'Draft Quiz', isPublished: false });

      const res = await request(app)
        .get(`/${createRes.body.data.quizId}`)
        .set(learnerHeaders);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('E_QUIZ_NOT_FOUND');
    });

    it('returns 403 when learner is not enrolled', async () => {
      const { quizId } = await createPublishedQuizWithQuestions();
      enrollmentClient.getEnrollment.mockResolvedValue(null);

      const res = await request(app).get(`/${quizId}`).set(learnerHeaders);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('E_NOT_ENROLLED');
    });
  });

  describe('POST /:quizId/attempts — submit attempt', () => {
    it('passes with 80% correct (4/5)', async () => {
      const { quizId, questionIds } = await createPublishedQuizWithQuestions();

      const answers = questionIds.map((questionId, i) => ({
        questionId,
        selectedIndex: i < 4 ? [0, 1, 0, 2, 0][i] : 1,
      }));

      const res = await request(app)
        .post(`/${quizId}/attempts`)
        .set(learnerHeaders)
        .send({ answers });

      expect(res.status).toBe(201);
      expect(res.body.data.score).toBe(80);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.questionFeedback).toHaveLength(5);
      res.body.data.questionFeedback.forEach((f) => {
        expect(f).toHaveProperty('questionId');
        expect(f).toHaveProperty('correct');
        expect(f).not.toHaveProperty('correctIndex');
      });
    });

    it('fails when below pass threshold', async () => {
      const { quizId, questionIds } = await createPublishedQuizWithQuestions();

      const answers = questionIds.map((questionId, i) => ({
        questionId,
        selectedIndex: i < 2 ? [0, 1][i] : 1,
      }));

      const res = await request(app)
        .post(`/${quizId}/attempts`)
        .set(learnerHeaders)
        .send({ answers });

      expect(res.status).toBe(201);
      expect(res.body.data.score).toBe(40);
      expect(res.body.data.passed).toBe(false);
    });

    it('rejects invalid questionId', async () => {
      const { quizId, questionIds } = await createPublishedQuizWithQuestions();

      const answers = questionIds.map((questionId, i) => ({
        questionId: i === 0 ? 'bad-id' : questionId,
        selectedIndex: 0,
      }));

      const res = await request(app)
        .post(`/${quizId}/attempts`)
        .set(learnerHeaders)
        .send({ answers });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('E_VALIDATION');
    });

    it('enforces max attempts', async () => {
      const createRes = await request(app)
        .post('/')
        .set(adminHeaders)
        .send({
          courseId: 'course-1',
          title: 'Limited Quiz',
          maxAttempts: 2,
          isPublished: true,
        });

      const quizId = createRes.body.data.quizId;

      const qRes = await request(app)
        .post(`/${quizId}/questions`)
        .set(adminHeaders)
        .send({
          prompt: 'Only Q',
          options: ['A', 'B'],
          correctIndex: 0,
          order: 0,
        });

      const questionId = qRes.body.data.questionId;
      const answers = [{ questionId, selectedIndex: 1 }];

      await request(app)
        .post(`/${quizId}/attempts`)
        .set(learnerHeaders)
        .send({ answers });

      await request(app)
        .post(`/${quizId}/attempts`)
        .set(learnerHeaders)
        .send({ answers });

      const res = await request(app)
        .post(`/${quizId}/attempts`)
        .set(learnerHeaders)
        .send({ answers });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('E_MAX_ATTEMPTS');
    });

    it('returns 403 when not enrolled', async () => {
      const { quizId, questionIds } = await createPublishedQuizWithQuestions();
      enrollmentClient.getEnrollment.mockResolvedValue(null);

      const answers = questionIds.map((questionId) => ({
        questionId,
        selectedIndex: 0,
      }));

      const res = await request(app)
        .post(`/${quizId}/attempts`)
        .set(learnerHeaders)
        .send({ answers });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('E_NOT_ENROLLED');
    });
  });

  describe('GET /attempts/me', () => {
    it('returns only the requesting user attempts', async () => {
      const { quizId, questionIds } = await createPublishedQuizWithQuestions();

      const answers = questionIds.map((questionId) => ({
        questionId,
        selectedIndex: 0,
      }));

      await request(app)
        .post(`/${quizId}/attempts`)
        .set(learnerHeaders)
        .send({ answers });

      const res = await request(app).get('/attempts/me').set(learnerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.attempts).toHaveLength(1);
      expect(res.body.data.attempts[0].quizId).toBe(quizId);

      const otherRes = await request(app).get('/attempts/me').set(otherLearnerHeaders);
      expect(otherRes.body.data.attempts).toHaveLength(0);
    });
  });
});
