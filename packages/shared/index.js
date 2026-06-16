const { ROLES } = require('./constants/roles');
const { CONTENT_TYPES, CONTENT_TYPE_VALUES } = require('./constants/contentTypes');
const { DIFFICULTY, DIFFICULTY_VALUES } = require('./constants/difficulty');
const { TX_STATUS, TX_TYPE } = require('./constants/transactionTypes');

const { AppError } = require('./errors/AppError');
const { ERROR_CODES } = require('./errors/errorCodes');

const { globalErrorHandler, catchAsync } = require('./middleware/globalErrorHandler');
const { serviceAuth } = require('./middleware/serviceAuth');
const { extractUser, requireAdmin } = require('./middleware/extractUser');


const {
  toPublicCourseDTO,
  toPublicModuleDTO,
  toPublicTopicDTO,
  toInstructorCourseDTO,
} = require('./dtos/CourseDTO');
const { toPublicEnrollmentDTO, toEnrollmentWithCourseDTO } = require('./dtos/EnrollmentDTO');
const { toPublicProfileDTO } = require('./dtos/UserDTO');

module.exports = {
  // Constants
  ROLES,
  CONTENT_TYPES,
  CONTENT_TYPE_VALUES,
  DIFFICULTY,
  DIFFICULTY_VALUES,
  TX_STATUS,
  TX_TYPE,

  // Errors
  AppError,
  ERROR_CODES,

  // Middleware
  globalErrorHandler,
  catchAsync,
  serviceAuth,
  extractUser,
  requireAdmin,

  // DTOs

  toPublicCourseDTO,
  toPublicModuleDTO,
  toPublicTopicDTO,
  toInstructorCourseDTO,
  toPublicEnrollmentDTO,
  toEnrollmentWithCourseDTO,
  toPublicProfileDTO,
};