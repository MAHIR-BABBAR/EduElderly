const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const { getCourseEligibility } = require('../controller/internalController');

const router = express.Router();

router.get(
  '/users/:userId/courses/:courseId/eligibility',
  serviceAuth,
  getCourseEligibility,
);

module.exports = router;
