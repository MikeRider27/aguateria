const express = require('express');
const { getFacturas, getFactura, createFactura, reenviar, anular } = require('../controllers/facturaController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin', 'cajero'));

router.route('/').get(getFacturas).post(createFactura);
router.get('/:id', getFactura);
router.post('/:id/reenviar', reenviar);
router.patch('/:id/anular', authorize('admin'), anular);

module.exports = router;
