const express = require('express');
const { getUsers, getRepartidores, createUser, updateUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/repartidores', getRepartidores);
router.route('/').get(authorize('admin'), getUsers).post(authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);

module.exports = router;
