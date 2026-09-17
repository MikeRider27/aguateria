const notFound = (req, res, next) => {
  res.status(404).json({ mensaje: `Ruta no encontrada: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  if (err.name === 'ValidationError') {
    const mensajes = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ mensaje: mensajes.join(', ') });
  }

  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue || {})[0];
    return res.status(400).json({ mensaje: `El valor de '${campo}' ya existe` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ mensaje: 'Identificador invalido' });
  }

  res.status(statusCode).json({ mensaje: err.message || 'Error interno del servidor' });
};

module.exports = { notFound, errorHandler };
