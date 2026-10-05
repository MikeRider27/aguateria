const express = require('express');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientEnvases,
} = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getClients).post(createClient);
router
  .route('/:id')
  .get(getClient)
  .put(updateClient)
  .delete(authorize('admin'), deleteClient);
router.get('/:id/envases', getClientEnvases);

module.exports = router;
