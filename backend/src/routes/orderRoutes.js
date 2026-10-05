const express = require('express');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deliverOrder,
  deleteOrder,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getOrders).post(createOrder);
router.route('/:id').get(getOrder).delete(authorize('admin'), deleteOrder);
router.patch('/:id/estado', updateOrderStatus);
router.patch('/:id/entregar', deliverOrder);

module.exports = router;
