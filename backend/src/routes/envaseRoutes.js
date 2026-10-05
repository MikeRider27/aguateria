const express = require('express');
const { getResumen, getClientesConEnvases, ajustarSaldo } = require('../controllers/envaseController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/resumen', getResumen);
router.get('/clientes', getClientesConEnvases);
router.post('/ajustes', authorize('admin'), ajustarSaldo);

module.exports = router;
