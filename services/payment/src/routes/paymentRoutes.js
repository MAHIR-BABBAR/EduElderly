const express = require('express');
const { extractUser } = require('@eduelderly/shared');
const { listMyTransactions, getMyOrder, confirmMyOrder } = require('../controller/paymentController');
const { orderIdRules } = require('../validators/paymentValidators');

const router = express.Router();

router.get('/transactions/me', extractUser, listMyTransactions);
router.get('/orders/:orderId', extractUser, orderIdRules, getMyOrder);
router.post('/orders/:orderId/confirm', extractUser, orderIdRules, confirmMyOrder);

module.exports = router;
