const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const {
  createUserProfile,
  syncUserProfile,
  incrementUserXP,
  getInternalProfile,
  getInternalStats,
} = require('../controller/userController');
const {
  createProfileRules,
  syncProfileRules,
  incrementXpRules,
  userIdParamRules,
} = require('../validators/profileValidators');

const router = express.Router();

router.get('/stats', serviceAuth, getInternalStats);
router.post('/profile', serviceAuth, createProfileRules, createUserProfile);
router.patch('/sync', serviceAuth, syncProfileRules, syncUserProfile);
router.get('/:userId/profile', serviceAuth, userIdParamRules, getInternalProfile);
router.patch('/:userId/xp', serviceAuth, incrementXpRules, incrementUserXP);

module.exports = router;
