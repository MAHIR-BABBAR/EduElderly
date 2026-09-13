const { catchAsync } = require('@eduelderly/shared');
const eligibilityService = require('../services/eligibility.service');

const getCourseEligibility = catchAsync(async (req, res) => {
  const { userId, courseId } = req.params;
  const data = await eligibilityService.getCourseQuizEligibility(userId, courseId);
  res.status(200).json({ success: true, data });
});

module.exports = { getCourseEligibility };
