const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const Question = {
  type: 'object',
  description: 'Public question shape. `correctIndex` is never returned.',
  properties: {
    questionId: S.id('0192b1d2-0000-7a1b-9f2e-000000000061'),
    quizId: { type: 'string' },
    prompt: { type: 'string', example: 'Which button sends an email?' },
    options: { type: 'array', items: { type: 'string' }, example: ['Send', 'Delete', 'Archive', 'Reply'] },
    order: { type: 'integer' },
  },
};

const Quiz = {
  type: 'object',
  properties: {
    quizId: S.id('0192b1d2-0000-7a1b-9f2e-000000000051'),
    courseId: { type: 'string' },
    moduleId: { type: 'string', nullable: true },
    title: { type: 'string', example: 'Email basics check' },
    passThreshold: { type: 'integer', example: 70, description: 'Percent required to pass' },
    maxAttempts: { type: 'integer', example: 3 },
    isPublished: { type: 'boolean' },
    questions: { type: 'array', items: S.ref('Question') },
  },
};

const AttemptResult = {
  type: 'object',
  properties: {
    attemptId: { type: 'string' },
    quizId: { type: 'string' },
    score: { type: 'integer', example: 80 },
    passed: { type: 'boolean' },
    submittedAt: S.dateTime,
    questionFeedback: {
      type: 'array',
      items: { type: 'object', properties: { questionId: { type: 'string' }, correct: { type: 'boolean' } } },
    },
  },
};

const AttemptSummary = {
  type: 'object',
  properties: {
    attemptId: { type: 'string' },
    quizId: { type: 'string' },
    score: { type: 'integer' },
    passed: { type: 'boolean' },
    submittedAt: S.dateTime,
  },
};

const CourseQuizEligibility = {
  type: 'object',
  properties: {
    allPassed: { type: 'boolean', description: 'True when every published quiz has a passing attempt (or there are none)' },
    totalQuizzes: { type: 'integer' },
    passedCount: { type: 'integer' },
    quizzes: {
      type: 'array',
      items: { type: 'object', properties: { quizId: { type: 'string' }, title: { type: 'string' }, passed: { type: 'boolean' } } },
    },
  },
};

module.exports = buildSpec({
  title: 'EduElderly Quiz Service',
  description:
    'Quizzes, questions, and graded attempts. Learners must be enrolled (active or completed) in the course. ' +
    'A passing attempt notifies the enrollment service so a certificate can be issued when the course is also complete.',
  gatewayPrefix: '/api/v1/quizzes',
  internalUrl: 'http://quiz:3005',
  tags: [
    { name: 'Quizzes', description: 'Take quizzes' },
    { name: 'Quiz admin', description: 'Author quizzes (admin role)' },
  ],
  schemas: { Question, Quiz, AttemptResult, AttemptSummary, CourseQuizEligibility },
  paths: {
    '/by-course/{courseId}': {
      get: {
        tags: ['Quizzes'],
        summary: 'List published quizzes for a course I am enrolled in',
        security: S.bearer,
        parameters: [S.pathParam('courseId', 'Course id')],
        responses: {
          200: S.envelope({ type: 'object', properties: { quizzes: { type: 'array', items: S.ref('Quiz') } } }),
          401: S.err('Unauthorized'),
          403: S.err('Forbidden'),
        },
      },
    },
    '/{quizId}': {
      get: {
        tags: ['Quizzes'],
        summary: 'Get a quiz with its questions (answers hidden)',
        security: S.bearer,
        parameters: [S.pathParam('quizId', 'Quiz id')],
        responses: { 200: S.envelope(S.ref('Quiz')), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/{quizId}/attempts': {
      post: {
        tags: ['Quizzes'],
        summary: 'Submit answers and get a graded result',
        description: 'Every question must be answered exactly once. Attempts beyond `maxAttempts` are rejected with 403 `E_MAX_ATTEMPTS`.',
        security: S.bearer,
        parameters: [S.pathParam('quizId', 'Quiz id')],
        requestBody: S.body(
          {
            type: 'object',
            required: ['answers'],
            properties: {
              answers: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  required: ['questionId', 'selectedIndex'],
                  properties: { questionId: { type: 'string' }, selectedIndex: { type: 'integer', minimum: 0 } },
                },
              },
            },
          },
          true,
          { answers: [{ questionId: '0192b1d2-0000-7a1b-9f2e-000000000061', selectedIndex: 0 }] },
        ),
        responses: {
          201: S.envelope(S.ref('AttemptResult')),
          400: S.err('ValidationError'),
          403: S.err('Forbidden'),
          404: S.err('NotFound'),
        },
      },
    },
    '/attempts/me': {
      get: {
        tags: ['Quizzes'],
        summary: 'List my attempts across all quizzes',
        security: S.bearer,
        responses: {
          200: S.envelope({ type: 'object', properties: { attempts: { type: 'array', items: S.ref('AttemptSummary') } } }),
          401: S.err('Unauthorized'),
        },
      },
    },
    '/': {
      post: {
        tags: ['Quiz admin'],
        summary: 'Create a quiz',
        security: S.bearer,
        requestBody: S.body(
          {
            type: 'object',
            required: ['courseId', 'title'],
            properties: {
              courseId: { type: 'string' },
              title: { type: 'string', maxLength: 200 },
              moduleId: { type: 'string' },
              passThreshold: { type: 'integer', minimum: 0, maximum: 100, default: 70 },
              maxAttempts: { type: 'integer', minimum: 1, default: 3 },
              isPublished: { type: 'boolean', default: false },
            },
          },
          true,
          { courseId: '0192b1d2-0000-7a1b-9f2e-000000000011', title: 'Email basics check', passThreshold: 70, maxAttempts: 3 },
        ),
        responses: { 201: S.envelope(S.ref('Quiz')), 400: S.err('ValidationError'), 403: S.err('Forbidden') },
      },
    },
    '/{quizId}/questions': {
      post: {
        tags: ['Quiz admin'],
        summary: 'Add a multiple-choice question',
        security: S.bearer,
        parameters: [S.pathParam('quizId', 'Quiz id')],
        requestBody: S.body(
          {
            type: 'object',
            required: ['prompt', 'options', 'correctIndex', 'order'],
            properties: {
              prompt: { type: 'string', maxLength: 1000 },
              options: { type: 'array', minItems: 2, items: { type: 'string' } },
              correctIndex: { type: 'integer', minimum: 0 },
              order: { type: 'integer', minimum: 0 },
            },
          },
          true,
          { prompt: 'Which button sends an email?', options: ['Send', 'Delete', 'Archive'], correctIndex: 0, order: 0 },
        ),
        responses: {
          201: S.envelope({ type: 'object', properties: { questionId: { type: 'string' }, quizId: { type: 'string' }, order: { type: 'integer' } } }),
          400: S.err('ValidationError'),
          403: S.err('Forbidden'),
          404: S.err('NotFound'),
        },
      },
    },
    '/internal/users/{userId}/courses/{courseId}/eligibility': {
      get: {
        tags: ['Internal'],
        summary: 'Has this learner passed every published quiz in the course?',
        parameters: [S.pathParam('userId', 'User id'), S.pathParam('courseId', 'Course id')],
        responses: { 200: S.envelope(S.ref('CourseQuizEligibility')) },
      },
    },
  },
});
