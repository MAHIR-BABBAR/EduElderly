const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const { sendInternalEmail } = require('../controllers/sendController');

const router = express.Router();

router.post('/send', serviceAuth, sendInternalEmail);

module.exports = router;
