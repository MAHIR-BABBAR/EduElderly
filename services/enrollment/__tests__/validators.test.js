/**
 * SEC-2 — the ids that get interpolated into internal service-client URLs must
 * be strict UUIDs, so a value like "a/../../courses/<id>/stats" can never reach
 * the validated handler and traverse to another endpoint.
 */
const {
  progressRules,
  enrollRules,
  topicIdRules,
} = require('../src/validators/enrollmentValidators');

// Run an express-validator rule chain against a fake request and report whether
// it produced a validation error (the last handler calls next(err) on failure).
const runRules = async (rules, { body = {}, params = {} } = {}) => {
  const req = { body, params, query: {} };
  for (const rule of rules) {
    const err = await new Promise((resolve) => {
      const maybe = rule(req, {}, (e) => resolve(e));
      if (maybe && typeof maybe.then === 'function') maybe.then(() => {});
    });
    if (err) return err; // handleValidationErrors short-circuits with the AppError
  }
  return null;
};

const VALID = '01a09b65-fc56-7712-90c8-45b4c6049669'; // a real UUIDv7 from seed data

describe('progressRules topicId (SEC-2)', () => {
  it('accepts a valid UUID topicId', async () => {
    const err = await runRules(progressRules, {
      params: { enrollmentId: 'demo-enr-x' },
      body: { topicId: VALID },
    });
    expect(err).toBeNull();
  });

  it('rejects a path-traversal topicId', async () => {
    const err = await runRules(progressRules, {
      params: { enrollmentId: 'demo-enr-x' },
      body: { topicId: 'a/../../courses/abc/stats' },
    });
    expect(err).not.toBeNull();
    expect(err.statusCode).toBe(400);
  });

  it('rejects an object topicId (NoSQL operator shape)', async () => {
    const err = await runRules(progressRules, {
      params: { enrollmentId: 'demo-enr-x' },
      body: { topicId: { $ne: null } },
    });
    expect(err).not.toBeNull();
    expect(err.statusCode).toBe(400);
  });
});

describe('enrollRules / topicIdRules', () => {
  it('rejects a non-UUID courseId', async () => {
    const err = await runRules(enrollRules, { body: { courseId: 'x/../y' } });
    expect(err).not.toBeNull();
  });

  it('rejects a non-UUID topic param', async () => {
    const err = await runRules(topicIdRules, { params: { topicId: 'x/../y' } });
    expect(err).not.toBeNull();
  });

  it('accepts a valid UUID courseId', async () => {
    const err = await runRules(enrollRules, { body: { courseId: VALID } });
    expect(err).toBeNull();
  });
});
