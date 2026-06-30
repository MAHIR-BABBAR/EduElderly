const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const { getDashboard } = require('../controllers/dashboardController');
const { listAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();

router.get('/dashboard', extractUser, requireAdmin, getDashboard);
router.get('/audit-logs', extractUser, requireAdmin, listAuditLogs);

module.exports = router;
