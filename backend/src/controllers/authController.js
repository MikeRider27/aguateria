const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc  Registrar usuario (solo admin puede crear otros usuarios)
// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ mensaje: 'Nombre, email y password son requeridos' });
    }
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ mensaje: 'Ya existe un usuario con ese email' });
    }
    const user = await User.create({ nombre, email, password, rol });
    res.status(201).json({
      _id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      token: generarToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Login
// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y password son requeridos' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.compararPassword(password))) {
      return res.status(401).json({ mensaje: 'Credenciales invalidas' });
    }
    if (!user.activo) {
      return res.status(401).json({ mensaje: 'Usuario inactivo, contacte al administrador' });
    }
    res.json({
      _id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      token: generarToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Obtener perfil actual
// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, getMe };
