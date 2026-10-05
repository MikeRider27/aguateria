const express = require('express');
const { getCuentas, getEstadoCuenta } = require('../controllers/cuentaController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin', 'cajero', 'vendedor'));

router.get('/', getCuentas);
router.get('/:id', getEstadoCuenta);

module.exports = router;
