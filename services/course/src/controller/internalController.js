const { catchAsync, toInstructorTopicDTO } = require('@eduelderly/shared');
const courseService = require('../services/course.service');
const topicService = require('../services/topic.service');

const getInternalCourse = catchAsync(async (req, res) => {
  const stats = await courseService.getCourseStats(req.params.courseId, { publishedOnly: true });
  res.status(200).json({ success: true, data: stats });
});

const getInternalCourseStats = catchAsync(async (req, res) => {
  const stats = await courseService.getCourseStats(req.params.courseId, { publishedOnly: false });
  res.status(200).json({ success: true, data: stats });
});

const getInternalTopic = catchAsync(async (req, res) => {
  const topic = await topicService.getTopicById(req.params.topicId);
  res.status(200).json({
    success: true,
    data: toInstructorTopicDTO(topic),
  });
});

module.exports = {
  getInternalCourse,
  getInternalCourseStats,
  getInternalTopic,
};
