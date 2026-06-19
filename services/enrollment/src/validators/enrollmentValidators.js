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

const enrollRules = [
  body('courseId').notEmpty().withMessage('courseId is required'),
  handleValidationErrors,
];

const enrollmentIdRules = [
  param('enrollmentId').notEmpty().withMessage('enrollmentId is required'),
  handleValidationErrors,
];

const topicIdRules = [
  param('topicId').notEmpty().withMessage('topicId is required'),
  handleValidationErrors,
];

const progressRules = [
  param('enrollmentId').notEmpty().withMessage('enrollmentId is required'),
  body('topicId').notEmpty().withMessage('topicId is required'),
  body('timeSpentMinutes').optional().isInt({ min: 0 }),
  handleValidationErrors,
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
];

const internalEnrollRules = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('courseId').notEmpty().withMessage('courseId is required'),
  body('paymentRef').optional().isString(),
  handleValidationErrors,
];

const internalLookupRules = [
  param('userId').notEmpty().withMessage('userId is required'),
  param('courseId').notEmpty().withMessage('courseId is required'),
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
};
