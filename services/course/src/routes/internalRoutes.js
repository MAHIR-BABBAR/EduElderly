const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const {
  getInternalCourse,
  getInternalCourseStats,
} = require('../controller/internalController');
const { courseIdRules } = require('../validators/courseValidators');

const router = express.Router();

router.get('/courses/:courseId', serviceAuth, courseIdRules, getInternalCourse);
router.get('/courses/:courseId/stats', serviceAuth, courseIdRules, getInternalCourseStats);

module.exports = router;
