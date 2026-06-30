/**
 * Normalize dashboard aggregator output for API responses.
 * @param {Object} raw - raw dashboard from admin dashboard.service
 */
const toDashboardDTO = (raw) => ({
  users: raw.users ?? null,
  courses: raw.courses ?? null,
  enrollments: raw.enrollments ?? null,
  revenue: raw.revenue ?? null,
  completions: raw.completions ?? 0,
  certificates: raw.certificates ?? 0,
  partialErrors: raw.partialErrors?.length ? raw.partialErrors : undefined,
});

module.exports = { toDashboardDTO };
