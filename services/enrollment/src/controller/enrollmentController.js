const {
  catchAsync,
  toPublicEnrollmentDTO,
  toEnrollmentWithCourseDTO,
  toEnrollmentDetailDTO,
} = require('@eduelderly/shared');
const enrollmentService = require('../services/enrollment.service');
const progressService = require('../services/progress.service');

const enroll = catchAsync(async (req, res) => {
  const result = await enrollmentService.enroll(req.user.userId, req.body.courseId);

  if (result.requiresPayment) {
    return res.status(202).json({
      success: true,
      data: {
        requiresPayment: true,
        checkout: result.checkout,
      },
    });
  }

  res.status(201).json({
    success: true,
    data: toPublicEnrollmentDTO(result.enrollment),
  });
});

const listEnrollments = catchAsync(async (req, res) => {
  const { items, pagination } = await enrollmentService.listEnrollmentsWithCourse(
    req.user.userId,
    req.query,
  );
  res.status(200).json({
    success: true,
    data: {
      enrollments: items.map(({ enrollment, courseSummary }) =>
        toEnrollmentWithCourseDTO(enrollment, courseSummary),
      ),
      pagination,
    },
  });
});

const getEnrollment = catchAsync(async (req, res) => {
  const { enrollment, courseSummary, resume } = await enrollmentService.getEnrollmentDetail(
    req.params.enrollmentId,
    req.user.userId,
  );
  res.status(200).json({
    success: true,
    data: toEnrollmentDetailDTO(enrollment, { courseSummary, resume }),
  });
});

const getResume = catchAsync(async (req, res) => {
  const { enrollment, nextTopicId, currentModuleId, currentLessonId } =
    await enrollmentService.getResume(req.params.enrollmentId, req.user.userId);

  res.status(200).json({
    success: true,
    data: toEnrollmentDetailDTO(enrollment, {
      resume: { nextTopicId, currentModuleId, currentLessonId },
    }),
  });
});

const updateProgress = catchAsync(async (req, res) => {
  const enrollment = await progressService.markTopicComplete(
    req.params.enrollmentId,
    req.user.userId,
    req.body,
  );
  res.status(200).json({
    success: true,
    data: toPublicEnrollmentDTO(enrollment),
  });
});

const getTopicContent = catchAsync(async (req, res) => {
  const content = await progressService.getTopicContent(
    req.params.enrollmentId,
    req.user.userId,
    req.params.topicId,
  );
  res.status(200).json({ success: true, data: content });
});

const dropEnrollment = catchAsync(async (req, res) => {
  const enrollment = await enrollmentService.dropEnrollment(
    req.params.enrollmentId,
    req.user.userId,
  );
  res.status(200).json({
    success: true,
    data: toPublicEnrollmentDTO(enrollment),
  });
});

const internalEnroll = catchAsync(async (req, res) => {
  const enrollment = await enrollmentService.enrollAfterPayment(req.body);
  res.status(201).json({
    success: true,
    data: toPublicEnrollmentDTO(enrollment),
  });
});

const internalLookup = catchAsync(async (req, res) => {
  const enrollment = await enrollmentService.getEnrollmentStatus(
    req.params.userId,
    req.params.courseId,
  );
  res.status(200).json({
    success: true,
    data: enrollment ? toPublicEnrollmentDTO(enrollment) : null,
  });
});

const getInternalStats = catchAsync(async (_req, res) => {
  const stats = await enrollmentService.getEnrollmentStats();
  res.status(200).json({ success: true, data: stats });
});

module.exports = {
  enroll,
  listEnrollments,
  getEnrollment,
  getResume,
  updateProgress,
  getTopicContent,
  dropEnrollment,
  internalEnroll,
  internalLookup,
  getInternalStats,
};
