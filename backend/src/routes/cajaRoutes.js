const express = require('express');
const { getPendientes, cerrarCaja, getCierres } = require('../controllers/cajaController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/pendientes', getPendientes);
router.get('/cierres', getCierres);
router.post('/cierres', authorize('admin', 'cajero'), cerrarCaja);

module.exports = router;
