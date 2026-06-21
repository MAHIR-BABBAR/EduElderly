const { body, param, query, validationResult } = require('express-validator');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { TX_STATUS } = require('@eduelderly/shared/constants/transactionTypes');

const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(message, 400, ERROR_CODES.E_VALIDATION));
  }
  next();
};

const checkoutRules = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('courseId').notEmpty().withMessage('courseId is required'),
  body('amount').isFloat({ min: 0 }).withMessage('amount must be a positive number'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  handleValidationErrors,
];

const orderIdRules = [
  param('orderId').notEmpty().withMessage('orderId is required'),
  handleValidationErrors,
];

const statusQueryRules = [
  query('status')
    .optional()
    .isIn(Object.values(TX_STATUS))
    .withMessage('Invalid status filter'),
  handleValidationErrors,
];

const updateStatusRules = [
  param('orderId').notEmpty().withMessage('orderId is required'),
  body('status')
    .isIn([TX_STATUS.SUCCESS, TX_STATUS.FAILED, TX_STATUS.REFUNDED])
    .withMessage('status must be success, failed, or refunded'),
  handleValidationErrors,
];

const internalStatusRules = [
  query('userId').notEmpty().withMessage('userId is required'),
  query('courseId').notEmpty().withMessage('courseId is required'),
  handleValidationErrors,
];

module.exports = {
  checkoutRules,
  orderIdRules,
  statusQueryRules,
  updateStatusRules,
  internalStatusRules,
};
