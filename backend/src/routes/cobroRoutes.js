const express = require('express');
const { getCobros, getCobro, createCobro, anular } = require('../controllers/cobroController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getCobros).post(authorize('admin', 'cajero', 'repartidor'), createCobro);
router.get('/:id', getCobro);
router.patch('/:id/anular', authorize('admin', 'cajero'), anular);

module.exports = router;
