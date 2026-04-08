class AppError extends Error {
  /**
   * @param {string} message    — human-readable error message (sent to client)
   * @param {number} statusCode — HTTP status code (400, 401, 403, 404, 409, 422, 429, 500)
   * @param {string} [code]     — machine-readable error code from ERROR_CODES enum
   */
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;               // e.g. 'E_AUTH_INVALID'
    this.isOperational = true;      // distinguishes AppError from programmer bugs
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };