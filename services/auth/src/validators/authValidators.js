const { body, validationResult } = require('express-validator');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');

/**
 * Input rules for the auth routes (SEC-7 / SEC-10). Before this the auth
 * service had no validation at all, so `{"email":{"$regex":"^a"}}` reached
 * `User.findOne` and could enumerate addresses one character at a time, and
 * `"a"` was an acceptable password.
 */
const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(message, 400, ERROR_CODES.E_VALIDATION));
  }
  return next();
};

const email = () =>
  body('email')
    .isString()
    .withMessage('email must be text')
    .bail()
    .trim()
    .isEmail()
    .withMessage('a valid email address is required')
    .isLength({ max: 254 })
    .normalizeEmail({ gmail_remove_dots: false });

// 8–72 characters (72 is bcrypt's input limit) with at least one letter and
// one number. Long enough to matter, simple enough to explain to a learner.
const password = (field = 'password') =>
  body(field)
    .isString()
    .withMessage(`${field} must be text`)
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage(`${field} must be between 8 and 72 characters`)
    .matches(/[A-Za-z]/)
    .withMessage(`${field} must include a letter`)
    .matches(/\d/)
    .withMessage(`${field} must include a number`);

const shortString = (field, max = 120) =>
  body(field).isString().withMessage(`${field} must be text`).bail().trim().isLength({ min: 1, max });

const otpToken = () =>
  body('otpToken').isString().withMessage('otpToken is required').bail().isLength({ min: 20, max: 4096 });

const otpRules = [
  email(),
  otpToken(),
  body('otp').isString().bail().trim().matches(/^\d{4,8}$/).withMessage('otp must be a 4–8 digit code'),
  body('type').optional().isIn(['login', 'verification']),
  handleValidationErrors,
];

module.exports = {
  registerRules: [email(), password(), shortString('name', 80), handleValidationErrors],
  loginRules: [email(), body('password').isString().bail().isLength({ min: 1, max: 72 }), handleValidationErrors],
  emailOnlyRules: [email(), body('type').optional().isIn(['login', 'verification']), handleValidationErrors],
  resendOtpRules: [email(), otpToken(), body('type').optional().isIn(['login']), handleValidationErrors],
  otpRules,
  resetPasswordRules: [shortString('token', 4096), password('newPassword'), handleValidationErrors],
  changePasswordRules: [
    body('currentPassword').isString().bail().isLength({ min: 1, max: 72 }),
    password('newPassword'),
    handleValidationErrors,
  ],
  verifyEmailRules: [
    // Accepted in the body (preferred) or the query for older email links.
    body('token').optional().isString().isLength({ min: 4, max: 4096 }),
    handleValidationErrors,
  ],
};
