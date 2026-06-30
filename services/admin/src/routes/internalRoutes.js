const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const { createAuditLogInternal } = require('../controllers/auditLogController');

const router = express.Router();

router.post('/audit-logs', serviceAuth, createAuditLogInternal);

module.exports = router;
