/**
 * OpenAPI 3 helpers shared by every service.
 *
 * Each service describes its own API in `src/docs/openapi.js` using `buildSpec`
 * and mounts it with `mountDocs`. The gateway aggregates every service spec into
 * one Swagger UI at `/docs`, so `servers[0].url` is the gateway prefix a client
 * actually calls (for example `/api/v1/enrollments`), not the container port.
 *
 * Internal service-to-service routes are documented too, tagged `Internal`, with
 * an operation-level `servers` entry pointing at the Docker network address so
 * readers can see they are not reachable through the gateway.
 */

const swaggerUi = require('swagger-ui-express');

const SCHEMA_PREFIX = '#/components/schemas/';
const RESPONSE_PREFIX = '#/components/responses/';

const ref = (name) => ({ $ref: `${SCHEMA_PREFIX}${name}` });

const errorResponse = (description, example) => ({
  description,
  content: {
    'application/json': {
      schema: ref('Error'),
      ...(example ? { example } : {}),
    },
  },
});

const STANDARD_RESPONSES = {
  ValidationError: errorResponse('Request failed validation', {
    success: false,
    statusCode: 400,
    code: 'E_VALIDATION',
    message: 'courseId is required',
  }),
  Unauthorized: errorResponse('Missing or invalid credentials', {
    success: false,
    statusCode: 401,
    code: 'E_AUTH_INVALID',
    message: 'No token provided',
  }),
  Forbidden: errorResponse('Authenticated but not allowed', {
    success: false,
    statusCode: 403,
    code: 'E_FORBIDDEN',
    message: 'Admin access required',
  }),
  NotFound: errorResponse('Resource not found', {
    success: false,
    statusCode: 404,
    code: 'E_NOT_FOUND',
    message: 'Enrollment not found',
  }),
  Conflict: errorResponse('State conflict', {
    success: false,
    statusCode: 409,
    code: 'E_ALREADY_ENROLLED',
    message: 'Already enrolled in this course',
  }),
  RateLimited: errorResponse('Too many requests', {
    success: false,
    statusCode: 429,
    code: 'E_RATE_LIMIT',
    message: 'Too many requests, please try again later',
  }),
  ServiceUnavailable: errorResponse('A downstream dependency is unavailable', {
    success: false,
    statusCode: 503,
    code: 'E_SERVICE_UNAVAILABLE',
    message: 'The requested service is temporarily unavailable',
  }),
};

const STANDARD_SCHEMAS = {
  Error: {
    type: 'object',
    required: ['success', 'statusCode', 'message'],
    properties: {
      success: { type: 'boolean', enum: [false] },
      statusCode: { type: 'integer', example: 404 },
      code: {
        type: 'string',
        nullable: true,
        description: 'Machine-readable error code from @eduelderly/shared ERROR_CODES',
        example: 'E_NOT_FOUND',
      },
      message: { type: 'string', example: 'Enrollment not found' },
    },
  },
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 42 },
      totalPages: { type: 'integer', example: 3 },
    },
  },
};

const jsonContent = (schema, example) => ({
  'application/json': { schema, ...(example ? { example } : {}) },
});

/** `{ success: true, data: <schema> }` response. */
const envelope = (dataSchema, description = 'OK', example) => ({
  description,
  content: jsonContent(
    {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', enum: [true] },
        data: dataSchema,
      },
    },
    example,
  ),
});

/** `{ success: true, message }` response for actions with no payload. */
const message = (description = 'OK', exampleMessage) => ({
  description,
  content: jsonContent(
    {
      type: 'object',
      required: ['success', 'message'],
      properties: {
        success: { type: 'boolean', enum: [true] },
        message: { type: 'string' },
      },
    },
    exampleMessage ? { success: true, message: exampleMessage } : undefined,
  ),
});

/** Data schema for `{ [key]: Item[], pagination }` list responses. */
const paginated = (key, itemSchema) => ({
  type: 'object',
  required: [key, 'pagination'],
  properties: {
    [key]: { type: 'array', items: itemSchema },
    pagination: ref('Pagination'),
  },
});

const err = (name) => ({ $ref: `${RESPONSE_PREFIX}${name}` });

const pathParam = (name, description, schema = { type: 'string' }) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema,
});

const query = (name, schema, description, required = false) => ({
  name,
  in: 'query',
  required,
  description,
  schema,
});

const body = (schema, required = true, example) => ({
  required,
  content: jsonContent(schema, example),
});

const PAGINATION_QUERY = [
  query('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number'),
  query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Items per page'),
];

const bearer = [{ bearerAuth: [] }];
const service = [{ serviceKey: [] }];
const publicRoute = [];

/**
 * Build a complete OpenAPI document for one service.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {string} options.gatewayPrefix   e.g. `/api/v1/enrollments`
 * @param {string} options.internalUrl     e.g. `http://enrollment:3004`
 * @param {Array<{name: string, description?: string}>} [options.tags]
 * @param {object} options.paths
 * @param {object} [options.schemas]
 * @param {string} [options.version]
 */
const buildSpec = ({
  title,
  description,
  gatewayPrefix,
  internalUrl,
  tags = [],
  paths,
  schemas = {},
  version = '1.0.0',
}) => {
  // Every operation tagged Internal gets the Docker-network server so the UI
  // shows the right base URL, and defaults to the service-key security scheme.
  const decoratedPaths = {};
  for (const [route, ops] of Object.entries(paths)) {
    decoratedPaths[route] = {};
    for (const [method, op] of Object.entries(ops)) {
      const isInternal = (op.tags || []).includes('Internal');
      decoratedPaths[route][method] = {
        ...op,
        ...(isInternal && internalUrl && !op.servers
          ? { servers: [{ url: internalUrl, description: 'Docker network only (not via gateway)' }] }
          : {}),
        ...(isInternal && !op.security ? { security: service } : {}),
      };
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title,
      version,
      description,
      license: { name: 'ISC' },
    },
    servers: [{ url: gatewayPrefix, description: 'Through the API gateway' }],
    tags: [
      ...tags,
      ...(Object.values(paths).some((ops) =>
        Object.values(ops).some((op) => (op.tags || []).includes('Internal')),
      )
        ? [
            {
              name: 'Internal',
              description:
                'Service-to-service endpoints. Require the shared `X-Service-Key`; not routed by the gateway.',
            },
          ]
        : []),
    ],
    paths: decoratedPaths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Access token from `POST /api/v1/auth/login`. The gateway validates it and forwards `X-User-Id` / `X-User-Role` to services.',
        },
        serviceKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Service-Key',
          description: 'Shared secret (`INTERNAL_SERVICE_KEY`) injected by the gateway or another service.',
        },
      },
      schemas: { ...STANDARD_SCHEMAS, ...schemas },
      responses: STANDARD_RESPONSES,
    },
  };
};

/**
 * Serve the spec as JSON at `/docs.json` and Swagger UI at `/docs`.
 * Mount before gateway-trust middleware: the document contains no secrets and
 * developers open it directly on the service port during host development.
 */
const mountDocs = (app, spec, { route = '/docs' } = {}) => {
  app.get(`${route}.json`, (_req, res) => res.json(spec));
  app.use(
    route,
    swaggerUi.serveFiles(spec, {}),
    swaggerUi.setup(spec, {
      customSiteTitle: `${spec.info.title} — API docs`,
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    }),
  );
};

/** Schema fragments reused across services. */
const S = {
  ref,
  envelope,
  message,
  paginated,
  err,
  pathParam,
  query,
  body,
  PAGINATION_QUERY,
  bearer,
  service,
  publicRoute,
  id: (example) => ({ type: 'string', format: 'uuid', example }),
  dateTime: { type: 'string', format: 'date-time', example: '2026-09-13T10:00:00.000Z' },
  url: { type: 'string', format: 'uri', example: 'https://cdn.example.com/image.jpg' },
};

module.exports = { buildSpec, mountDocs, S, STANDARD_RESPONSES, STANDARD_SCHEMAS };
