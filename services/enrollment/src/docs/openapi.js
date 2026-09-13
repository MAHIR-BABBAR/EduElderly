const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const Enrollment = {
  type: 'object',
  properties: {
    enrollmentId: S.id('0192b1d2-0000-7a1b-9f2e-000000000041'),
    userId: { type: 'string' },
    courseId: { type: 'string' },
    status: { type: 'string', enum: ['active', 'completed', 'dropped'] },
    progressPercent: { type: 'integer', minimum: 0, maximum: 100, example: 50 },
    completedModules: { type: 'array', items: { type: 'string' } },
    completedTopics: { type: 'array', items: { type: 'string' } },
    currentModuleId: { type: 'string', nullable: true },
    currentLessonId: { type: 'string', nullable: true },
    enrolledAt: S.dateTime,
    startedAt: { ...S.dateTime, nullable: true },
    completedAt: { ...S.dateTime, nullable: true },
    certificateIssued: { type: 'boolean' },
    certificateId: { type: 'string', nullable: true },
    lastAccessedAt: { ...S.dateTime, nullable: true },
    totalTimeSpentMinutes: { type: 'integer' },
  },
};

const CourseSummary = {
  type: 'object',
  description: 'Merged from the course service per request; never duplicated in the enrollment database.',
  properties: {
    courseId: { type: 'string' },
    title: { type: 'string' },
    thumbnailUrl: { type: 'string', nullable: true },
    instructorName: { type: 'string', nullable: true },
  },
};

const EnrollmentWithCourse = {
  allOf: [S.ref('Enrollment'), { type: 'object', properties: { course: S.ref('CourseSummary') } }],
};

const EnrollmentDetail = {
  allOf: [
    S.ref('EnrollmentWithCourse'),
    {
      type: 'object',
      properties: {
        nextTopicId: { type: 'string', nullable: true, description: 'First incomplete topic in curriculum order' },
      },
    },
  ],
};

const Checkout = {
  type: 'object',
  properties: {
    orderId: { type: 'string' },
    checkoutUrl: { type: 'string', format: 'uri' },
  },
};

const TopicContent = {
  type: 'object',
  properties: {
    topicId: { type: 'string' },
    title: { type: 'string' },
    contentType: { type: 'string', enum: ['video', 'article', 'pdf', 'audio'] },
    contentUrl: { type: 'string', description: 'Only returned to enrolled learners' },
    durationMinutes: { type: 'integer' },
  },
};

const CertificateEligibility = {
  type: 'object',
  properties: {
    issued: { type: 'boolean' },
    certId: { type: 'string' },
    alreadyIssued: { type: 'boolean' },
    reason: { type: 'string', enum: ['not_completed', 'quizzes_incomplete', 'issue_failed'] },
    eligibility: {
      type: 'object',
      properties: {
        allPassed: { type: 'boolean' },
        totalQuizzes: { type: 'integer' },
        passedCount: { type: 'integer' },
      },
    },
  },
};

const idParam = S.pathParam('enrollmentId', 'Enrollment id');

module.exports = buildSpec({
  title: 'EduElderly Enrollment Service',
  description:
    'Enrollment, lesson progress, XP awards, resume position, and the enrolled-only content gate. ' +
    'Owns the course-completion decision: a certificate is issued only when every lesson is done and every course quiz is passed.',
  gatewayPrefix: '/api/v1/enrollments',
  internalUrl: 'http://enrollment:3004',
  tags: [
    { name: 'Enrollment', description: 'Enroll, list, drop' },
    { name: 'Learning', description: 'Progress, resume, lesson content' },
  ],
  schemas: { Enrollment, CourseSummary, EnrollmentWithCourse, EnrollmentDetail, Checkout, TopicContent, CertificateEligibility },
  paths: {
    '/': {
      post: {
        tags: ['Enrollment'],
        summary: 'Enroll in a course',
        description:
          'Free courses create the enrollment immediately (201). Paid courses create a pending order in the payment service ' +
          'and return 202 with a checkout URL; the enrollment is created when the payment is confirmed.',
        security: S.bearer,
        requestBody: S.body({ type: 'object', required: ['courseId'], properties: { courseId: { type: 'string' } } }),
        responses: {
          201: S.envelope(S.ref('Enrollment'), 'Enrolled (free course)'),
          202: S.envelope(
            { type: 'object', properties: { requiresPayment: { type: 'boolean', enum: [true] }, checkout: S.ref('Checkout') } },
            'Payment required',
          ),
          400: S.err('ValidationError'),
          401: S.err('Unauthorized'),
          404: S.err('NotFound'),
          409: S.err('Conflict'),
          503: S.err('ServiceUnavailable'),
        },
      },
      get: {
        tags: ['Enrollment'],
        summary: 'List my enrollments with course summaries',
        security: S.bearer,
        parameters: S.PAGINATION_QUERY,
        responses: { 200: S.envelope(S.paginated('enrollments', S.ref('EnrollmentWithCourse'))), 401: S.err('Unauthorized') },
      },
    },
    '/{enrollmentId}': {
      get: {
        tags: ['Enrollment'],
        summary: 'Get an enrollment with course summary and resume position',
        security: S.bearer,
        parameters: [idParam],
        responses: { 200: S.envelope(S.ref('EnrollmentDetail')), 401: S.err('Unauthorized'), 404: S.err('NotFound') },
      },
      delete: {
        tags: ['Enrollment'],
        summary: 'Drop an enrollment (soft)',
        security: S.bearer,
        parameters: [idParam],
        responses: { 200: S.envelope(S.ref('Enrollment')), 401: S.err('Unauthorized'), 404: S.err('NotFound') },
      },
    },
    '/{enrollmentId}/resume': {
      get: {
        tags: ['Learning'],
        summary: 'Where to continue',
        security: S.bearer,
        parameters: [idParam],
        responses: { 200: S.envelope(S.ref('EnrollmentDetail')), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/{enrollmentId}/progress': {
      patch: {
        tags: ['Learning'],
        summary: 'Mark a topic complete',
        description:
          'Idempotent per topic. Awards topic XP once, recomputes module and course progress, and at 100 percent marks the ' +
          'enrollment completed, awards course XP once, and runs the certificate eligibility check.',
        security: S.bearer,
        parameters: [idParam],
        requestBody: S.body(
          {
            type: 'object',
            required: ['topicId'],
            properties: { topicId: { type: 'string' }, timeSpentMinutes: { type: 'integer', minimum: 0 } },
          },
          true,
          { topicId: '0192b1d2-0000-7a1b-9f2e-000000000031', timeSpentMinutes: 7 },
        ),
        responses: {
          200: S.envelope(S.ref('Enrollment')),
          400: S.err('ValidationError'),
          403: S.err('Forbidden'),
          404: S.err('NotFound'),
        },
      },
    },
    '/{enrollmentId}/topics/{topicId}/content': {
      get: {
        tags: ['Learning'],
        summary: 'Content gate: fetch a lesson URL',
        description: 'The only place a topic `contentUrl` is served. Requires an active or completed enrollment on that course.',
        security: S.bearer,
        parameters: [idParam, S.pathParam('topicId', 'Topic id')],
        responses: { 200: S.envelope(S.ref('TopicContent')), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/internal/enroll': {
      post: {
        tags: ['Internal'],
        summary: 'Create an enrollment after a confirmed payment',
        description: 'Idempotent: returns the existing active enrollment if one exists.',
        requestBody: S.body({
          type: 'object',
          required: ['userId', 'courseId'],
          properties: { userId: { type: 'string' }, courseId: { type: 'string' }, paymentRef: { type: 'string' } },
        }),
        responses: { 201: S.envelope(S.ref('Enrollment')), 404: S.err('NotFound') },
      },
    },
    '/internal/users/{userId}/courses/{courseId}': {
      get: {
        tags: ['Internal'],
        summary: 'Look up an active or completed enrollment (quiz access check)',
        parameters: [S.pathParam('userId', 'User id'), S.pathParam('courseId', 'Course id')],
        responses: { 200: S.envelope({ ...S.ref('Enrollment'), nullable: true }) },
      },
    },
    '/internal/certificate-eligibility': {
      post: {
        tags: ['Internal'],
        summary: 'Re-run the certificate eligibility check (called by quiz after a pass)',
        requestBody: S.body({
          type: 'object',
          required: ['userId', 'courseId'],
          properties: { userId: { type: 'string' }, courseId: { type: 'string' } },
        }),
        responses: { 200: S.envelope(S.ref('CertificateEligibility')) },
      },
    },
    '/internal/stats': {
      get: {
        tags: ['Internal'],
        summary: 'Enrollment counts for the admin dashboard',
        responses: {
          200: S.envelope({
            type: 'object',
            properties: {
              totalEnrollments: { type: 'integer' },
              activeEnrollments: { type: 'integer' },
              completedEnrollments: { type: 'integer' },
            },
          }),
        },
      },
    },
  },
});
