const express = require('express');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { getUserProfile, updateUserProfile, updateAvatar, updateSettings, getLeaderboard, getUserById } = require('../controller/userController');

const router = express.Router();

// ── INTERNAL routes — service-to-service only ──────────────────
router.post('/users/create', serviceAuth, userController.createUserProfile);
router.post('/users/:userId/xp', serviceAuth, userController.addXP);


// ── LEARNER routes — require authenticated user ────────────────
router.get('/users/profile', extractUser, userController.getUserProfile);
router.put('/users/profile', extractUser, userController.updateUserProfile);


// ── ADMIN routes — require admin role ─────────────────────────
router.get('/users', extractUser, requireAdmin, userController.listUsers);
router.get('/users/:userId', extractUser, requireAdmin, userController.getUserById);

// Health
router.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'user-service', uptime: process.uptime() })
);

module.exports = router;