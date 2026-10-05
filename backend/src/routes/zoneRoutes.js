const express = require('express');
const { getZones, createZone, updateZone, deleteZone } = require('../controllers/zoneController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getZones).post(authorize('admin'), createZone);
router.route('/:id').put(authorize('admin'), updateZone).delete(authorize('admin'), deleteZone);

module.exports = router;
