const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const {
  createUserProfile,
  syncUserProfile,
  incrementUserXP,
} = require('../controller/userController');
const {
  createProfileRules,
  syncProfileRules,
  incrementXpRules,
} = require('../validators/profileValidators');

const router = express.Router();

router.post('/profile', serviceAuth, createProfileRules, createUserProfile);
router.patch('/sync', serviceAuth, syncProfileRules, syncUserProfile);
router.patch('/:userId/xp', serviceAuth, incrementXpRules, incrementUserXP);

module.exports = router;
