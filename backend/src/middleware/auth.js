const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ mensaje: 'No autorizado, token no proporcionado' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.activo) {
      return res.status(401).json({ mensaje: 'No autorizado, usuario invalido' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'No autorizado, token invalido' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ mensaje: 'No tiene permisos para esta accion' });
    }
    next();
  };
};

module.exports = { protect, authorize };
