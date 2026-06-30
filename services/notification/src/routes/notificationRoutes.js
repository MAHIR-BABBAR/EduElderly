const express = require('express');
const { extractUser } = require('@eduelderly/shared');
const {
  listMyNotifications,
  markNotificationRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/me', extractUser, listMyNotifications);
router.patch('/me/:notificationId/read', extractUser, markNotificationRead);

module.exports = router;
