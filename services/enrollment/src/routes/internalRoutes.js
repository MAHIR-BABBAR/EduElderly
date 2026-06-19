const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const {
  internalEnroll,
  internalLookup,
} = require('../controller/enrollmentController');
const {
  internalEnrollRules,
  internalLookupRules,
} = require('../validators/enrollmentValidators');

const router = express.Router();

router.post('/enroll', serviceAuth, internalEnrollRules, internalEnroll);
router.get(
  '/users/:userId/courses/:courseId',
  serviceAuth,
  internalLookupRules,
  internalLookup,
);

module.exports = router;
