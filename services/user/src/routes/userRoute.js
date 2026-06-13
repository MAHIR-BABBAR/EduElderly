const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const { extractUser, requireAdmin } = require('../middleware/extractUser');
const {
    getUserProfile,
    updateUserProfile,
    createUserProfile,
    listUsers,
    getUserById,
} = require('../controller/userController');

const router = express.Router();

router.post('/users/create', serviceAuth, createUserProfile);

router.get('/users/profile', extractUser, getUserProfile);
router.put('/users/profile', extractUser, updateUserProfile);

router.get('/users', extractUser, requireAdmin, listUsers);
router.get('/users/:userId', extractUser, requireAdmin, getUserById);

router.get('/health', (_req, res) =>
    res.json({ status: 'ok', service: 'user-service', uptime: process.uptime() }),
);

module.exports = router;
