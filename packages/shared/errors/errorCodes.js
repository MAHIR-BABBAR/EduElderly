const ERROR_CODES = Object.freeze({
  // Auth
  E_AUTH_INVALID:         'E_AUTH_INVALID',        // wrong email or password
  E_AUTH_UNVERIFIED:      'E_AUTH_UNVERIFIED',     // email not OTP-verified yet
  E_AUTH_TOKEN_EXPIRED:   'E_AUTH_TOKEN_EXPIRED',  // JWT access token expired
  E_AUTH_TOKEN_INVALID:   'E_AUTH_TOKEN_INVALID',  // JWT malformed/tampered
  E_AUTH_REFRESH_INVALID: 'E_AUTH_REFRESH_INVALID',
  E_OTP_INVALID:          'E_OTP_INVALID',         // wrong OTP entered
  E_OTP_EXPIRED:          'E_OTP_EXPIRED',         // OTP past 10-min window
  E_OTP_MAX_ATTEMPTS:     'E_OTP_MAX_ATTEMPTS',    // 5 wrong attempts locked
  E_OTP_GENERATION_ERROR: 'E_OTP_GENERATION_ERROR',  

  // User / Registration
  E_EMAIL_TAKEN:          'E_EMAIL_TAKEN',         // duplicate registration
  E_USER_NOT_FOUND:       'E_USER_NOT_FOUND',
  E_USER_SUSPENDED:       'E_USER_SUSPENDED',

  // Validation
  E_VALIDATION:           'E_VALIDATION',          // express-validator failures
  E_FORBIDDEN:            'E_FORBIDDEN',           // role mismatch


  // Course / Enrollment
  E_COURSE_NOT_FOUND:     'E_COURSE_NOT_FOUND',
  E_ALREADY_ENROLLED:     'E_ALREADY_ENROLLED',
  E_NOT_ENROLLED:         'E_NOT_ENROLLED',

  // Payment
  E_PAY_SIGNATURE:        'E_PAY_SIGNATURE',       // HMAC mismatch
  E_PAY_FAILED:           'E_PAY_FAILED',

  // General
  E_NOT_FOUND:            'E_NOT_FOUND',
  E_INTERNAL:             'E_INTERNAL',
  E_RATE_LIMIT:           'E_RATE_LIMIT',
  E_ROUTE_NOT_FOUND:      'E_ROUTE_NOT_FOUND',
  ERROR_CODES:            'E_SERVICE_UNAVAILABLE'
});

module.exports = { ERROR_CODES };