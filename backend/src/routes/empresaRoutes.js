const express = require('express');
const { getEmpresa, updateEmpresa } = require('../controllers/empresaController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(authorize('admin', 'cajero'), getEmpresa).put(authorize('admin'), updateEmpresa);

module.exports = router;
