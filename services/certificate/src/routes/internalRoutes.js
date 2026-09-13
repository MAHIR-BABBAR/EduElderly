const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const { issueInternal, getInternalStats, getQueueStats } = require('../controllers/internalController');

const router = express.Router();

router.get('/stats', serviceAuth, getInternalStats);
router.post('/issue', serviceAuth, issueInternal);
router.get('/queue/stats', serviceAuth, getQueueStats);

module.exports = router;
