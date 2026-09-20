const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const { sendInternalEmail, getQueueStats } = require('../controllers/sendController');

const router = express.Router();

router.post('/send', serviceAuth, sendInternalEmail);
router.get('/queue/stats', serviceAuth, getQueueStats);

module.exports = router;
