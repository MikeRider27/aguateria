const express = require('express');
const c = require('../controllers/equipoController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const gestion = authorize('admin', 'vendedor');

router.use(protect);

router.route('/').get(c.getEquipos).post(gestion, c.createEquipo);
router.route('/:id').get(c.getEquipo).put(gestion, c.updateEquipo);
router.post('/:id/asignar', gestion, c.asignar);
router.post('/:id/devolver', authorize('admin', 'vendedor', 'repartidor'), c.devolver);
router.post('/:id/mantenimiento', authorize('admin', 'vendedor', 'repartidor'), c.registrarMantenimiento);
router.post('/:id/baja', authorize('admin'), c.darDeBaja);

module.exports = router;
