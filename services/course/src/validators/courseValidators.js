const { body, param, query, validationResult } = require('express-validator');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { DIFFICULTY_VALUES } = require('@eduelderly/shared/constants/difficulty');
const { CONTENT_TYPE_VALUES } = require('@eduelderly/shared/constants/contentTypes');

const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(message, 400, ERROR_CODES.E_VALIDATION));
  }
  next();
};

const paginationRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
];

const createCategoryRules = [
  body('name').notEmpty().isString().isLength({ max: 120 }),
  body('description').optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
];

const updateCategoryRules = [
  param('categoryId').notEmpty(),
  body('name').optional().isString().isLength({ max: 120 }),
  body('description').optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
];

const categoryIdRules = [
  param('categoryId').notEmpty(),
  handleValidationErrors,
];

const createCourseRules = [
  body('title').notEmpty().isString().isLength({ max: 200 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('categoryId').notEmpty(),
  body('thumbnailUrl').optional().isString(),
  body('isPaid').optional().isBoolean(),
  body('price').optional().isFloat({ min: 0 }),
  body('difficulty').optional().isIn(DIFFICULTY_VALUES),
  body('estimatedHours').optional().isFloat({ min: 0 }),
  body('instructorName').notEmpty().isString().isLength({ max: 120 }),
  body('slug').optional().isString().isLength({ max: 80 }),
  handleValidationErrors,
];

const updateCourseRules = [
  param('courseId').notEmpty(),
  body('title').optional().isString().isLength({ max: 200 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('categoryId').optional().notEmpty(),
  body('thumbnailUrl').optional().isString(),
  body('isPaid').optional().isBoolean(),
  body('price').optional().isFloat({ min: 0 }),
  body('difficulty').optional().isIn(DIFFICULTY_VALUES),
  body('estimatedHours').optional().isFloat({ min: 0 }),
  body('instructorName').optional().isString().isLength({ max: 120 }),
  body('slug').optional().isString().isLength({ max: 80 }),
  handleValidationErrors,
];

const courseIdRules = [
  param('courseId').notEmpty(),
  handleValidationErrors,
];

const publishRules = [
  param('courseId').notEmpty(),
  body('isPublished').isBoolean(),
  handleValidationErrors,
];

const createModuleRules = [
  param('courseId').notEmpty(),
  body('title').notEmpty().isString().isLength({ max: 200 }),
  body('order').isInt({ min: 0 }),
  handleValidationErrors,
];

const updateModuleRules = [
  param('moduleId').notEmpty(),
  body('title').optional().isString().isLength({ max: 200 }),
  body('order').optional().isInt({ min: 0 }),
  handleValidationErrors,
];

const moduleIdRules = [
  param('moduleId').notEmpty(),
  handleValidationErrors,
];

const createTopicRules = [
  param('moduleId').notEmpty(),
  body('title').notEmpty().isString().isLength({ max: 200 }),
  body('contentType').isIn(CONTENT_TYPE_VALUES),
  body('contentUrl').optional().isString(),
  body('durationMinutes').optional().isInt({ min: 0 }),
  body('order').isInt({ min: 0 }),
  handleValidationErrors,
];

const updateTopicRules = [
  param('topicId').notEmpty(),
  body('title').optional().isString().isLength({ max: 200 }),
  body('contentType').optional().isIn(CONTENT_TYPE_VALUES),
  body('contentUrl').optional().isString(),
  body('durationMinutes').optional().isInt({ min: 0 }),
  body('order').optional().isInt({ min: 0 }),
  handleValidationErrors,
];

const topicIdRules = [
  param('topicId').notEmpty(),
  handleValidationErrors,
];

module.exports = {
  paginationRules,
  createCategoryRules,
  updateCategoryRules,
  categoryIdRules,
  createCourseRules,
  updateCourseRules,
  courseIdRules,
  publishRules,
  createModuleRules,
  updateModuleRules,
  moduleIdRules,
  createTopicRules,
  updateTopicRules,
  topicIdRules,
};
