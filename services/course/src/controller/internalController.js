const { catchAsync } = require('@eduelderly/shared');
const courseService = require('../services/course.service');

const getInternalCourse = catchAsync(async (req, res) => {
  const stats = await courseService.getCourseStats(req.params.courseId, { publishedOnly: true });
  res.status(200).json({ success: true, data: stats });
});

const getInternalCourseStats = catchAsync(async (req, res) => {
  const stats = await courseService.getCourseStats(req.params.courseId, { publishedOnly: false });
  res.status(200).json({ success: true, data: stats });
});

module.exports = {
  getInternalCourse,
  getInternalCourseStats,
};
