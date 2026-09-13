const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const {
  internalEnroll,
  internalLookup,
  getInternalStats,
  triggerCertificateEligibility,
} = require('../controller/enrollmentController');
const {
  internalEnrollRules,
  internalLookupRules,
  certificateEligibilityRules,
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
router.post(
  '/certificate-eligibility',
  serviceAuth,
  certificateEligibilityRules,
  triggerCertificateEligibility,
);

module.exports = router;
