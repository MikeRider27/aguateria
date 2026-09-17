const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
// Solo un admin autenticado puede registrar nuevos usuarios
router.post('/register', protect, authorize('admin'), register);
router.get('/me', protect, getMe);

module.exports = router;
