const mongoose = require('mongoose');
const EnvaseMovimiento = require('../models/EnvaseMovimiento');

// Saldo de envases agrupado por cliente y producto (solo saldos distintos de cero)
const saldosPorCliente = async (filtro = {}) => {
  const match = {};
  if (filtro.cliente) match.cliente = new mongoose.Types.ObjectId(String(filtro.cliente));
  if (filtro.producto) match.producto = new mongoose.Types.ObjectId(String(filtro.producto));

  return EnvaseMovimiento.aggregate([
    { $match: match },
    {
      $group: {
        _id: { cliente: '$cliente', producto: '$producto' },
        saldo: { $sum: '$cantidad' },
        ultimoMovimiento: { $max: '$createdAt' },
      },
    },
    { $match: { saldo: { $ne: 0 } } },
    {
      $project: {
        _id: 0,
        cliente: '$_id.cliente',
        producto: '$_id.producto',
        saldo: 1,
        ultimoMovimiento: 1,
      },
    },
  ]);
};

// Total de envases en poder de clientes, por producto
const totalesEnClientes = async () => {
  const filas = await EnvaseMovimiento.aggregate([
    { $group: { _id: '$producto', total: { $sum: '$cantidad' } } },
  ]);
  return new Map(filas.map((f) => [f._id.toString(), f.total]));
};

module.exports = { saldosPorCliente, totalesEnClientes };
