const { catchAsync, toPublicCourseDTO, toInstructorCourseDTO } = require('@eduelderly/shared');
const courseService = require('../services/course.service');

const listCourses = catchAsync(async (req, res) => {
  const { courses, pagination } = await courseService.listPublishedCourses(req.query);
  res.status(200).json({
    success: true,
    data: {
      courses: courses.map((c) => toPublicCourseDTO({ ...c.toObject(), moduleCount: c.moduleIds.length })),
      pagination,
    },
  });
});

const getCourse = catchAsync(async (req, res) => {
  const { course, modules } = await courseService.getCourseDetail(req.params.courseId, { publishedOnly: true });
  const dto = toInstructorCourseDTO(
    { ...course.toObject(), moduleCount: course.moduleIds.length },
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
  res.status(200).json({
    success: true,
    data: toPublicCourseDTO({ ...course.toObject(), moduleCount: course.moduleIds.length }),
  });
});

const deleteCourse = catchAsync(async (req, res) => {
  await courseService.softDeleteCourse(req.params.courseId);
  res.status(200).json({ success: true, message: 'Course deleted' });
});

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  publishCourse,
  deleteCourse,
};
