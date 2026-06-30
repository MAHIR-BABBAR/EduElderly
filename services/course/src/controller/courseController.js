const {
  catchAsync,
  toPublicCourseDTO,
  toPublicModuleDTO,
  toInstructorCourseDTO,
} = require('@eduelderly/shared');
const { AUDIT_ACTION } = require('@eduelderly/shared/constants/auditActions');
const courseService = require('../services/course.service');
const adminClient = require('../clients/adminClient');

const mapPublicCourseDetail = ({ course, modules, totalTopics }) => {
  const publicModules = modules.map((mod) => toPublicModuleDTO(mod, mod.topics || []));
  return {
    ...toPublicCourseDTO(
      { ...course.toObject(), moduleCount: course.moduleIds.length },
      { totalTopics },
    ),
    modules: publicModules,
  };
};

const listCourses = catchAsync(async (req, res) => {
  const { courses, pagination } = await courseService.listPublishedCourses(req.query);
  res.status(200).json({
    success: true,
    data: {
      courses: courses.map((c) => toPublicCourseDTO(c, { totalTopics: c.totalTopics })),
      pagination,
    },
  });
});

const listAdminCourses = catchAsync(async (req, res) => {
  const { courses, pagination } = await courseService.listAdminCourses(req.query);
  res.status(200).json({
    success: true,
    data: {
      courses: courses.map((c) => toInstructorCourseDTO(c)),
      pagination,
    },
  });
});

const getCourse = catchAsync(async (req, res) => {
  const { course, modules, totalTopics } = await courseService.getCourseDetail(
    req.params.courseId,
    { publishedOnly: true },
  );
  res.status(200).json({
    success: true,
    data: mapPublicCourseDetail({ course, modules, totalTopics }),
  });
});

const getAdminCourse = catchAsync(async (req, res) => {
  const { course, modules, totalTopics } = await courseService.getCourseDetail(
    req.params.courseId,
    { publishedOnly: false },
  );
  const dto = toInstructorCourseDTO(
    { ...course.toObject(), moduleCount: course.moduleIds.length, totalTopics },
    { modules },
  );
  res.status(200).json({ success: true, data: dto });
});

const createCourse = catchAsync(async (req, res) => {
  const course = await courseService.createCourse(req.body);
  res.status(201).json({
    success: true,
    data: toInstructorCourseDTO({ ...course.toObject(), moduleCount: 0 }),
  });
});

const updateCourse = catchAsync(async (req, res) => {
  const course = await courseService.updateCourse(req.params.courseId, req.body);
  res.status(200).json({
    success: true,
    data: toInstructorCourseDTO({ ...course.toObject(), moduleCount: course.moduleIds.length }),
  });
});

const publishCourse = catchAsync(async (req, res) => {
  const course = await courseService.togglePublish(req.params.courseId, req.body.isPublished);
  adminClient.logAuditSafe({
    actorId: req.user.userId,
    action: req.body.isPublished ? AUDIT_ACTION.PUBLISH_COURSE : AUDIT_ACTION.UNPUBLISH_COURSE,
    targetType: 'course',
    targetId: req.params.courseId,
    metadata: { isPublished: req.body.isPublished },
  });
  res.status(200).json({
    success: true,
    data: toPublicCourseDTO({ ...course.toObject(), moduleCount: course.moduleIds.length }),
  });
});

const deleteCourse = catchAsync(async (req, res) => {
  await courseService.softDeleteCourse(req.params.courseId);
  adminClient.logAuditSafe({
    actorId: req.user.userId,
    action: AUDIT_ACTION.DELETE_COURSE,
    targetType: 'course',
    targetId: req.params.courseId,
  });
  res.status(200).json({ success: true, message: 'Course deleted' });
});

module.exports = {
  listCourses,
  listAdminCourses,
  getCourse,
  getAdminCourse,
  createCourse,
  updateCourse,
  publishCourse,
  deleteCourse,
};
