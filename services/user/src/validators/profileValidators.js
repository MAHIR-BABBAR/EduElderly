const { body, param, query, validationResult } = require('express-validator');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { ROLES } = require('@eduelderly/shared/constants/roles');

const ROLE_VALUES = Object.values(ROLES);

const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(message, 400, ERROR_CODES.E_VALIDATION));
  }
  next();
};

const updateProfileRules = [
  body('avatarUrl').optional({ values: 'null' }).isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('avatarUrl must be an HTTPS URL'),
  body('fontSizePref').optional().isIn(['default', 'large', 'xl', 'huge'])
    .withMessage('fontSizePref must be default, large, xl, or huge'),
  body('highContrast').optional().isBoolean().withMessage('highContrast must be a boolean'),
  body('lang').optional().isIn(['en']).withMessage('lang must be en'),
  body('bio').optional().isString().isLength({ max: 300 }).withMessage('bio max 300 characters'),
  handleValidationErrors,
];

const createProfileRules = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('name').notEmpty().withMessage('name is required').isString().isLength({ min: 2, max: 80 }),
  body('email').notEmpty().withMessage('email is required').isEmail(),
  body('role').optional().isIn(ROLE_VALUES),
  handleValidationErrors,
];

const syncProfileRules = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('name').optional().isString().isLength({ min: 2, max: 80 }),
  body('email').optional().isEmail(),
  body('role').optional().isIn(ROLE_VALUES),
  body('isActive').optional().isBoolean(),
  body().custom((value) => {
    const hasField = ['name', 'email', 'role', 'isActive'].some((key) => value[key] !== undefined);
    if (!hasField) {
      throw new Error('At least one of name, email, role, or isActive is required');
    }
    return true;
  }),
  handleValidationErrors,
];

const incrementXpRules = [
  param('userId').notEmpty().withMessage('userId is required'),
  body('amount').isInt().withMessage('amount must be an integer'),
  handleValidationErrors,
];

const listUsersRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('q').optional().isString().isLength({ max: 100 }),
  handleValidationErrors,
];

const userIdParamRules = [
  param('userId').notEmpty().withMessage('userId is required'),
  handleValidationErrors,
];

module.exports = {
  updateProfileRules,
  createProfileRules,
  syncProfileRules,
  incrementXpRules,
  listUsersRules,
  userIdParamRules,
};
