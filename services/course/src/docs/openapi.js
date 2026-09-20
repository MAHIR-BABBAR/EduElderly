const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const Category = {
  type: 'object',
  properties: {
    categoryId: S.id('0192b1d2-0000-7a1b-9f2e-000000000001'),
    name: { type: 'string', example: 'Digital Skills' },
    slug: { type: 'string', example: 'digital-skills' },
    description: { type: 'string' },
  },
};

const Topic = {
  type: 'object',
  description: 'Public topic shape. `contentUrl` is never exposed here; learners fetch it through the enrollment content gate.',
  properties: {
    topicId: S.id('0192b1d2-0000-7a1b-9f2e-000000000031'),
    title: { type: 'string', example: 'Sending your first email' },
    contentType: { type: 'string', enum: ['video', 'article', 'pdf', 'audio'] },
    durationMinutes: { type: 'integer', example: 8 },
    order: { type: 'integer', example: 0 },
  },
};

const Module = {
  type: 'object',
  properties: {
    moduleId: S.id('0192b1d2-0000-7a1b-9f2e-000000000021'),
    title: { type: 'string', example: 'Getting started with email' },
    order: { type: 'integer' },
    topicCount: { type: 'integer' },
    topics: { type: 'array', items: S.ref('Topic') },
  },
};

const Course = {
  type: 'object',
  properties: {
    courseId: S.id('0192b1d2-0000-7a1b-9f2e-000000000011'),
    title: { type: 'string', example: 'Email Basics for Everyday Life' },
    slug: { type: 'string', example: 'email-basics' },
    description: { type: 'string' },
    categoryId: { type: 'string' },
    thumbnailUrl: { ...S.url, nullable: true },
    isPublished: { type: 'boolean' },
    isPaid: { type: 'boolean' },
    price: { type: 'number', example: 0 },
    difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
    estimatedHours: { type: 'number', example: 2.5 },
    instructorName: { type: 'string', example: 'Dr. Priya Sharma' },
    credits: { type: 'string', description: 'Source attribution shown on the course page.' },
    moduleCount: { type: 'integer' },
    totalTopics: { type: 'integer' },
    createdAt: S.dateTime,
    updatedAt: S.dateTime,
  },
};

const CourseDetail = {
  allOf: [S.ref('Course'), { type: 'object', properties: { modules: { type: 'array', items: S.ref('Module') } } }],
};

const AdminCourse = {
  allOf: [
    S.ref('Course'),
    {
      type: 'object',
      properties: {
        moduleIds: { type: 'array', items: { type: 'string' } },
        modules: { type: 'array', items: S.ref('Module') },
      },
    },
  ],
};

const CourseStats = {
  type: 'object',
  description: 'Compact summary used by enrollment to compute progress without duplicating course data.',
  properties: {
    courseId: { type: 'string' },
    title: { type: 'string' },
    thumbnailUrl: { type: 'string', nullable: true },
    instructorName: { type: 'string', nullable: true },
    isPublished: { type: 'boolean' },
    isPaid: { type: 'boolean' },
    price: { type: 'number' },
    topicCount: { type: 'integer' },
    topicIds: { type: 'array', items: { type: 'string' } },
    modules: {
      type: 'array',
      items: { type: 'object', properties: { moduleId: { type: 'string' }, topicIds: { type: 'array', items: { type: 'string' } } } },
    },
  },
};

const courseWrite = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 5000 },
    categoryId: { type: 'string' },
    thumbnailUrl: { type: 'string' },
    isPaid: { type: 'boolean' },
    price: { type: 'number', minimum: 0 },
    difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
    estimatedHours: { type: 'number', minimum: 0 },
    instructorName: { type: 'string', maxLength: 120 },
    credits: { type: 'string', maxLength: 300 },
    slug: { type: 'string', maxLength: 80 },
  },
};

const adminResponses = { 400: S.err('ValidationError'), 401: S.err('Unauthorized'), 403: S.err('Forbidden') };

module.exports = buildSpec({
  title: 'EduElderly Course Service',
  description:
    'Catalog of categories, courses, modules, and topics. Public reads expose no lesson content URLs; ' +
    'admins manage content; other services read compact stats over internal routes.',
  gatewayPrefix: '/api/v1/courses',
  internalUrl: 'http://course:3003',
  tags: [
    { name: 'Catalog', description: 'Public browsing' },
    { name: 'Categories', description: 'Mounted at `/api/v1/categories`' },
    { name: 'Course admin', description: 'Create and manage courses (admin role)' },
    { name: 'Content admin', description: 'Modules and topics (admin role)' },
  ],
  schemas: { Category, Topic, Module, Course, CourseDetail, AdminCourse, CourseStats },
  paths: {
    '/': {
      get: {
        tags: ['Catalog'],
        summary: 'List published courses',
        description: 'Search, filter and sort happen server-side so the client never filters a single page in memory.',
        security: S.publicRoute,
        parameters: [
          ...S.PAGINATION_QUERY,
          S.query('search', { type: 'string', maxLength: 100 }, 'Full-text search over title and description'),
          S.query('categoryId', { type: 'string', format: 'uuid' }, 'Only courses in this category'),
          S.query('difficulty', { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }, 'Only this difficulty'),
          S.query('isPaid', { type: 'boolean' }, 'true = paid only, false = free only'),
          S.query('sort', { type: 'string', enum: ['newest', 'popular', 'a-z'], default: 'newest' }, 'Sort order'),
        ],
        responses: { 200: S.envelope(S.paginated('courses', S.ref('Course'))) },
      },
      post: {
        tags: ['Course admin'],
        summary: 'Create a course (unpublished)',
        security: S.bearer,
        requestBody: S.body({ ...courseWrite, required: ['title', 'categoryId', 'instructorName'] }),
        responses: { 201: S.envelope(S.ref('AdminCourse')), ...adminResponses },
      },
    },
    '/{courseId}': {
      get: {
        tags: ['Catalog'],
        summary: 'Get a published course with its curriculum',
        security: S.publicRoute,
        parameters: [S.pathParam('courseId', 'Course id')],
        responses: { 200: S.envelope(S.ref('CourseDetail')), 404: S.err('NotFound') },
      },
      put: {
        tags: ['Course admin'],
        summary: 'Update a course',
        security: S.bearer,
        parameters: [S.pathParam('courseId', 'Course id')],
        requestBody: S.body(courseWrite),
        responses: { 200: S.envelope(S.ref('AdminCourse')), ...adminResponses, 404: S.err('NotFound') },
      },
      delete: {
        tags: ['Course admin'],
        summary: 'Soft-delete a course',
        security: S.bearer,
        parameters: [S.pathParam('courseId', 'Course id')],
        responses: { 200: S.message('Deleted', 'Course deleted'), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/{courseId}/publish': {
      patch: {
        tags: ['Course admin'],
        summary: 'Publish or unpublish a course (audit logged)',
        security: S.bearer,
        parameters: [S.pathParam('courseId', 'Course id')],
        requestBody: S.body({ type: 'object', required: ['isPublished'], properties: { isPublished: { type: 'boolean' } } }),
        responses: { 200: S.envelope(S.ref('Course')), ...adminResponses, 404: S.err('NotFound') },
      },
    },
    '/admin/courses': {
      get: {
        tags: ['Course admin'],
        summary: 'List all courses including unpublished',
        security: S.bearer,
        parameters: S.PAGINATION_QUERY,
        responses: { 200: S.envelope(S.paginated('courses', S.ref('AdminCourse'))), ...adminResponses },
      },
    },
    '/admin/courses/{courseId}': {
      get: {
        tags: ['Course admin'],
        summary: 'Get a course with full content including topic content URLs',
        security: S.bearer,
        parameters: [S.pathParam('courseId', 'Course id')],
        responses: { 200: S.envelope(S.ref('AdminCourse')), ...adminResponses, 404: S.err('NotFound') },
      },
    },
    '/{courseId}/modules': {
      get: {
        tags: ['Catalog'],
        summary: 'List modules of a course',
        security: S.publicRoute,
        parameters: [S.pathParam('courseId', 'Course id')],
        responses: { 200: S.envelope({ type: 'array', items: S.ref('Module') }), 404: S.err('NotFound') },
      },
      post: {
        tags: ['Content admin'],
        summary: 'Add a module',
        security: S.bearer,
        parameters: [S.pathParam('courseId', 'Course id')],
        requestBody: S.body({
          type: 'object',
          required: ['title', 'order'],
          properties: { title: { type: 'string', maxLength: 200 }, order: { type: 'integer', minimum: 0 } },
        }),
        responses: { 201: S.envelope(S.ref('Module')), ...adminResponses, 404: S.err('NotFound') },
      },
    },
    '/modules/{moduleId}': {
      put: {
        tags: ['Content admin'],
        summary: 'Update a module',
        security: S.bearer,
        parameters: [S.pathParam('moduleId', 'Module id')],
        requestBody: S.body({ type: 'object', properties: { title: { type: 'string' }, order: { type: 'integer' } } }),
        responses: { 200: S.envelope(S.ref('Module')), ...adminResponses, 404: S.err('NotFound') },
      },
      delete: {
        tags: ['Content admin'],
        summary: 'Delete a module and its topics',
        security: S.bearer,
        parameters: [S.pathParam('moduleId', 'Module id')],
        responses: { 200: S.message('Deleted', 'Module deleted'), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/modules/{moduleId}/topics': {
      post: {
        tags: ['Content admin'],
        summary: 'Add a topic (lesson) to a module',
        security: S.bearer,
        parameters: [S.pathParam('moduleId', 'Module id')],
        requestBody: S.body(
          {
            type: 'object',
            required: ['title', 'contentType', 'order'],
            properties: {
              title: { type: 'string', maxLength: 200 },
              contentType: { type: 'string', enum: ['video', 'article', 'pdf', 'audio'] },
              contentUrl: { type: 'string', description: 'YouTube or article URL; only served to enrolled learners' },
              durationMinutes: { type: 'integer', minimum: 0 },
              order: { type: 'integer', minimum: 0 },
            },
          },
          true,
          { title: 'Sending your first email', contentType: 'video', contentUrl: 'https://www.youtube.com/watch?v=abc123', durationMinutes: 8, order: 0 },
        ),
        responses: { 201: S.envelope(S.ref('Topic')), ...adminResponses, 404: S.err('NotFound') },
      },
    },
    '/topics/{topicId}': {
      put: {
        tags: ['Content admin'],
        summary: 'Update a topic',
        security: S.bearer,
        parameters: [S.pathParam('topicId', 'Topic id')],
        requestBody: S.body({
          type: 'object',
          properties: {
            title: { type: 'string' },
            contentType: { type: 'string', enum: ['video', 'article', 'pdf', 'audio'] },
            contentUrl: { type: 'string' },
            durationMinutes: { type: 'integer' },
            order: { type: 'integer' },
          },
        }),
        responses: { 200: S.envelope(S.ref('Topic')), ...adminResponses, 404: S.err('NotFound') },
      },
      delete: {
        tags: ['Content admin'],
        summary: 'Delete a topic',
        security: S.bearer,
        parameters: [S.pathParam('topicId', 'Topic id')],
        responses: { 200: S.message('Deleted', 'Topic deleted'), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        description: 'Gateway path: `GET /api/v1/categories`.',
        servers: [{ url: '/api/v1', description: 'Through the API gateway' }],
        security: S.publicRoute,
        responses: { 200: S.envelope({ type: 'array', items: S.ref('Category') }) },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a category',
        servers: [{ url: '/api/v1', description: 'Through the API gateway' }],
        security: S.bearer,
        requestBody: S.body({
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string', maxLength: 120 }, description: { type: 'string', maxLength: 500 } },
        }),
        responses: { 201: S.envelope(S.ref('Category')), ...adminResponses },
      },
    },
    '/categories/{categoryId}': {
      put: {
        tags: ['Categories'],
        summary: 'Update a category',
        servers: [{ url: '/api/v1', description: 'Through the API gateway' }],
        security: S.bearer,
        parameters: [S.pathParam('categoryId', 'Category id')],
        requestBody: S.body({ type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } }),
        responses: { 200: S.envelope(S.ref('Category')), ...adminResponses, 404: S.err('NotFound') },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete a category',
        servers: [{ url: '/api/v1', description: 'Through the API gateway' }],
        security: S.bearer,
        parameters: [S.pathParam('categoryId', 'Category id')],
        responses: { 200: S.message('Deleted', 'Category deleted'), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/internal/stats': {
      get: {
        tags: ['Internal'],
        summary: 'Catalog counts for the admin dashboard',
        responses: {
          200: S.envelope({ type: 'object', properties: { totalCourses: { type: 'integer' }, publishedCourses: { type: 'integer' } } }),
        },
      },
    },
    '/internal/courses/{courseId}': {
      get: {
        tags: ['Internal'],
        summary: 'Get a course regardless of publish state (enrollment, payment)',
        parameters: [S.pathParam('courseId', 'Course id')],
        responses: { 200: S.envelope(S.ref('AdminCourse')), 404: S.err('NotFound') },
      },
    },
    '/internal/courses/{courseId}/stats': {
      get: {
        tags: ['Internal'],
        summary: 'Compact course stats for progress calculation',
        parameters: [S.pathParam('courseId', 'Course id')],
        responses: { 200: S.envelope(S.ref('CourseStats')), 404: S.err('NotFound') },
      },
    },
    '/internal/topics/{topicId}': {
      get: {
        tags: ['Internal'],
        summary: 'Get a topic including its content URL (enrollment content gate)',
        parameters: [S.pathParam('topicId', 'Topic id')],
        responses: {
          200: S.envelope({
            allOf: [S.ref('Topic'), { type: 'object', properties: { moduleId: { type: 'string' }, courseId: { type: 'string' }, contentUrl: { type: 'string', nullable: true } } }],
          }),
          404: S.err('NotFound'),
        },
      },
    },
  },
});
