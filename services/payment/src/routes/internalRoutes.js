const express = require('express');
const { serviceAuth } = require('@eduelderly/shared');
const { checkout, getStatus } = require('../controller/internalController');
const { checkoutRules, internalStatusRules } = require('../validators/paymentValidators');

const router = express.Router();

router.post('/checkout', serviceAuth, checkoutRules, checkout);
router.get('/status', serviceAuth, internalStatusRules, getStatus);

module.exports = router;
