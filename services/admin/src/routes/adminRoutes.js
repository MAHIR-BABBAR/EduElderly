const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const { getDashboard, getPublicStats } = require('../controllers/dashboardController');
const { listAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();

// Public: the landing page trust strip. No auth, no sensitive figures.
router.get('/public-stats', getPublicStats);

router.get('/dashboard', extractUser, requireAdmin, getDashboard);
router.get('/audit-logs', extractUser, requireAdmin, listAuditLogs);

module.exports = router;
