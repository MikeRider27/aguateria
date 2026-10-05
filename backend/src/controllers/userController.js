const User = require('../models/User');

const CAMPOS_EDITABLES = ['nombre', 'email', 'rol', 'activo', 'telefono'];

const getUsers = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.rol) filtro.rol = req.query.rol;
    if (req.query.activo !== undefined) filtro.activo = req.query.activo === 'true';
    const users = await User.find(filtro).sort({ nombre: 1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Lista reducida para selects (cualquier usuario autenticado)
const getRepartidores = async (req, res, next) => {
  try {
    const users = await User.find({ rol: 'repartidor', activo: true }).select('nombre').sort({ nombre: 1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ mensaje: 'El password es requerido' });
    const datos = { password };
    CAMPOS_EDITABLES.forEach((c) => req.body[c] !== undefined && (datos[c] = req.body[c]));
    const user = await User.create(datos);
    res.status(201).json(await User.findById(user._id));
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    if (user._id.equals(req.user._id) && (req.body.activo === false || (req.body.rol && req.body.rol !== 'admin'))) {
      return res.status(400).json({ mensaje: 'No puede desactivarse ni quitarse el rol de admin a si mismo' });
    }

    CAMPOS_EDITABLES.forEach((c) => req.body[c] !== undefined && user.set(c, req.body[c]));
    if (req.body.password) user.password = req.body.password;
    await user.save();
    res.json(await User.findById(user._id));
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getRepartidores, createUser, updateUser };
