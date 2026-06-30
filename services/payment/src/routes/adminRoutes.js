const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const { listOrders, getOrder, updateOrderStatus } = require('../controller/adminController');
const {
  orderIdRules,
  statusQueryRules,
  paginationRules,
  updateStatusRules,
} = require('../validators/paymentValidators');

const router = express.Router();

router.get('/orders', extractUser, requireAdmin, statusQueryRules, paginationRules, listOrders);
router.get('/orders/:orderId', extractUser, requireAdmin, orderIdRules, getOrder);
router.patch(
  '/orders/:orderId/status',
  extractUser,
  requireAdmin,
  updateStatusRules,
  updateOrderStatus,
);

module.exports = router;
