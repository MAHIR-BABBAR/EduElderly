const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const {
  getInternalCourse,
  getInternalCourseStats,
  getInternalTopic,
  getInternalCatalogStats,
} = require('../controller/internalController');
const { courseIdRules, topicIdRules } = require('../validators/courseValidators');

const router = express.Router();

router.get('/stats', serviceAuth, getInternalCatalogStats);
router.get('/courses/:courseId', serviceAuth, courseIdRules, getInternalCourse);
router.get('/courses/:courseId/stats', serviceAuth, courseIdRules, getInternalCourseStats);
router.get('/topics/:topicId', serviceAuth, topicIdRules, getInternalTopic);

module.exports = router;
