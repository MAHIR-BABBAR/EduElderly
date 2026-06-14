const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const {
  getUserProfile,
  updateUserProfile,
  listUsers,
  getUserById,
} = require('../controller/userController');
const { updateProfileRules, listUsersRules, userIdParamRules } = require('../validators/profileValidators');

const router = express.Router();

router.get('/profile', extractUser, getUserProfile);
router.put('/profile', extractUser, updateProfileRules, updateUserProfile);

router.get('/', extractUser, requireAdmin, listUsersRules, listUsers);
router.get('/:userId', extractUser, requireAdmin, userIdParamRules, getUserById);

module.exports = router;
