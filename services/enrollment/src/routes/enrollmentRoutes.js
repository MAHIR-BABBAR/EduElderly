const express = require('express');
const { extractUser } = require('@eduelderly/shared');
const {
  enroll,
  listEnrollments,
  getEnrollment,
  getResume,
  updateProgress,
  getTopicContent,
  dropEnrollment,
} = require('../controller/enrollmentController');
const {
  enrollRules,
  enrollmentIdRules,
  topicIdRules,
  progressRules,
  paginationRules,
} = require('../validators/enrollmentValidators');

const router = express.Router();

router.post('/', extractUser, enrollRules, enroll);
router.get('/', extractUser, paginationRules, listEnrollments);
router.get('/:enrollmentId/resume', extractUser, enrollmentIdRules, getResume);
router.get(
  '/:enrollmentId/topics/:topicId/content',
  extractUser,
  enrollmentIdRules,
  topicIdRules,
  getTopicContent,
);
router.patch('/:enrollmentId/progress', extractUser, progressRules, updateProgress);
router.get('/:enrollmentId', extractUser, enrollmentIdRules, getEnrollment);
router.delete('/:enrollmentId', extractUser, enrollmentIdRules, dropEnrollment);

module.exports = router;
