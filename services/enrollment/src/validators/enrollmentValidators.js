const { body, param, query, validationResult } = require('express-validator');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');

const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(message, 400, ERROR_CODES.E_VALIDATION));
  }
  next();
};

// courseId and topicId are interpolated into internal service-client URLs, so
// they must be strict UUIDs (SEC-2). A non-UUID value such as
// "a/../../courses/<id>/stats" would otherwise traverse to another endpoint.
// enrollmentId is only ever used in this service's own scoped DB queries and
// carries a "demo-enr-" prefix in seed data, so it stays a safe-charset check.
const isUuid = (field, location = body) =>
  location(field).isString().bail().isUUID().withMessage(`${field} must be a valid id`);

const isSafeId = (field, location = param) =>
  location(field)
    .isString()
    .bail()
    .matches(/^[\w-]{1,64}$/)
    .withMessage(`${field} is invalid`);

const enrollRules = [
  isUuid('courseId'),
  handleValidationErrors,
];

const enrollmentIdRules = [
  isSafeId('enrollmentId'),
  handleValidationErrors,
];

const topicIdRules = [
  isUuid('topicId', param),
  handleValidationErrors,
];

const progressRules = [
  isSafeId('enrollmentId'),
  isUuid('topicId'),
  body('timeSpentMinutes').optional().isInt({ min: 0, max: 600 }).toInt(),
  handleValidationErrors,
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
];

const internalEnrollRules = [
  body('userId').isString().bail().notEmpty().withMessage('userId is required'),
  isUuid('courseId'),
  body('paymentRef').optional().isString(),
  handleValidationErrors,
];

const internalLookupRules = [
  isSafeId('userId'),
  isUuid('courseId', param),
  handleValidationErrors,
];

const certificateEligibilityRules = [
  body('userId').isString().bail().notEmpty().withMessage('userId is required'),
  isUuid('courseId'),
  handleValidationErrors,
];

module.exports = {
  enrollRules,
  enrollmentIdRules,
  topicIdRules,
  progressRules,
  paginationRules,
  internalEnrollRules,
  internalLookupRules,
  certificateEligibilityRules,
};
