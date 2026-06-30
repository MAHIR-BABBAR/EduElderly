const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const {
  internalEnroll,
  internalLookup,
  getInternalStats,
} = require('../controller/enrollmentController');
const {
  internalEnrollRules,
  internalLookupRules,
} = require('../validators/enrollmentValidators');

const router = express.Router();

router.get('/stats', serviceAuth, getInternalStats);
router.post('/enroll', serviceAuth, internalEnrollRules, internalEnroll);
router.get(
  '/users/:userId/courses/:courseId',
  serviceAuth,
  internalLookupRules,
  internalLookup,
);

module.exports = router;
