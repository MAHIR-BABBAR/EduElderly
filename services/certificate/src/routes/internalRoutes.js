const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const { issueInternal, getInternalStats } = require('../controllers/internalController');

const router = express.Router();

router.get('/stats', serviceAuth, getInternalStats);
router.post('/issue', serviceAuth, issueInternal);

module.exports = router;
