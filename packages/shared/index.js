const { ROLES } = require('./constants/roles');
const { CONTENT_TYPES, CONTENT_TYPE_VALUES } = require('./constants/contentTypes');
const { DIFFICULTY, DIFFICULTY_VALUES } = require('./constants/difficulty');
const { TX_STATUS, TX_TYPE } = require('./constants/transactionTypes');
const { ENROLLMENT_STATUS, ENROLLMENT_STATUS_VALUES } = require('./constants/enrollmentStatus');
const { XP_REWARDS } = require('./constants/xpRewards');
const {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_CHANNEL_VALUES,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_VALUES,
} = require('./constants/notificationTypes');
const { AUDIT_ACTION, AUDIT_ACTION_VALUES } = require('./constants/auditActions');

const { AppError } = require('./errors/AppError');
const { ERROR_CODES } = require('./errors/errorCodes');

const { globalErrorHandler, catchAsync } = require('./middleware/globalErrorHandler');
const { serviceAuth } = require('./middleware/serviceAuth');
const { requireGateway } = require('./middleware/requireGateway');
const { extractUser, requireAdmin } = require('./middleware/extractUser');


const {
  toPublicCourseDTO,
  toPublicModuleDTO,
  toPublicTopicDTO,
  toInstructorTopicDTO,
  toInstructorCourseDTO,
} = require('./dtos/CourseDTO');
const { toPublicEnrollmentDTO, toEnrollmentWithCourseDTO, toEnrollmentDetailDTO } = require('./dtos/EnrollmentDTO');
const { toPublicProfileDTO } = require('./dtos/UserDTO');
const {
  toPublicQuestionDTO,
  toPublicQuizDTO,
  toAttemptResultDTO,
  toAttemptSummaryDTO,
} = require('./dtos/QuizDTO');
const { toPublicTransactionDTO, toAdminTransactionDTO } = require('./dtos/TransactionDTO');
const { toPublicNotificationDTO } = require('./dtos/NotificationDTO');
const { toPublicCertificateDTO, toCertificateVerifyDTO } = require('./dtos/CertificateDTO');
const { toPublicAuditLogDTO } = require('./dtos/AuditLogDTO');
const { toDashboardDTO } = require('./dtos/DashboardDTO');

const { assertRequiredEnv, getInternalServiceKey } = require('./utils/assertRequiredEnv');
const { createLogger, requestId } = require('./utils/logger');

module.exports = {
  // Constants
  ROLES,
  CONTENT_TYPES,
  CONTENT_TYPE_VALUES,
  DIFFICULTY,
  DIFFICULTY_VALUES,
  TX_STATUS,
  TX_TYPE,
  ENROLLMENT_STATUS,
  ENROLLMENT_STATUS_VALUES,
  XP_REWARDS,
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_CHANNEL_VALUES,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_VALUES,
  AUDIT_ACTION,
  AUDIT_ACTION_VALUES,

  // Errors
  AppError,
  ERROR_CODES,

  // Middleware
  globalErrorHandler,
  catchAsync,
  serviceAuth,
  requireGateway,
  extractUser,
  requireAdmin,

  // DTOs

  toPublicCourseDTO,
  toPublicModuleDTO,
  toPublicTopicDTO,
  toInstructorTopicDTO,
  toInstructorCourseDTO,
  toPublicEnrollmentDTO,
  toEnrollmentWithCourseDTO,
  toEnrollmentDetailDTO,
  toPublicProfileDTO,
  toPublicQuestionDTO,
  toPublicQuizDTO,
  toAttemptResultDTO,
  toAttemptSummaryDTO,
  toPublicTransactionDTO,
  toAdminTransactionDTO,
  toPublicNotificationDTO,
  toPublicCertificateDTO,
  toCertificateVerifyDTO,
  toPublicAuditLogDTO,
  toDashboardDTO,

  // Utils
  assertRequiredEnv,
  getInternalServiceKey,
  createLogger,
  requestId,
};