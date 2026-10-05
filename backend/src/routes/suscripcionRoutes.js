const express = require('express');
const c = require('../controllers/suscripcionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin', 'cajero', 'vendedor'));

router.route('/').get(c.getSuscripciones).post(c.createSuscripcion);
router.post('/generar', authorize('admin'), c.generar);
router.route('/:id').put(c.updateSuscripcion).delete(c.deleteSuscripcion);

module.exports = router;
