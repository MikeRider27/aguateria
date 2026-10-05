const express = require('express');
const { getVentas, getClientesInactivos, getComodatos } = require('../controllers/reporteController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin', 'cajero', 'vendedor'));

router.get('/ventas', getVentas);
router.get('/clientes-inactivos', getClientesInactivos);
router.get('/comodatos', getComodatos);

module.exports = router;
