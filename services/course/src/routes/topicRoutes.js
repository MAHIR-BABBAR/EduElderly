const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const {
  createTopic,
  updateTopic,
  deleteTopic,
} = require('../controllers/topicController');
const {
  createTopicRules,
  updateTopicRules,
  moduleIdRules,
  topicIdRules,
} = require('../validators/courseValidators');

const router = express.Router();

router.post('/modules/:moduleId/topics', extractUser, requireAdmin, createTopicRules, createTopic);
router.put('/topics/:topicId', extractUser, requireAdmin, updateTopicRules, updateTopic);
router.delete('/topics/:topicId', extractUser, requireAdmin, topicIdRules, deleteTopic);

module.exports = router;
