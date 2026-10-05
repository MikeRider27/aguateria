const mongoose = require('mongoose');
const Order = require('../models/Order');

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// Deuda de pedidos entregados (total - pagado) agrupada por cliente
const deudasPorCliente = async (clienteId = null) => {
  const match = { estado: 'entregado', $expr: { $gt: ['$total', '$montoPagado'] } };
  if (clienteId) match.cliente = oid(clienteId);
  return Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$cliente',
        saldo: { $sum: { $subtract: ['$total', '$montoPagado'] } },
        pedidos: { $sum: 1 },
        masAntiguo: { $min: '$entregadoEn' },
      },
    },
  ]);
};

const deudaCliente = async (clienteId) => (await deudasPorCliente(clienteId))[0]?.saldo || 0;

// Monto comprometido en pedidos a credito aun no entregados
const pendienteCredito = async (clienteId) => {
  const filas = await Order.aggregate([
    { $match: { cliente: oid(clienteId), estado: { $in: ['pendiente', 'en_camino'] }, condicion: 'credito' } },
    { $group: { _id: null, total: { $sum: { $subtract: ['$total', '$montoPagado'] } } } },
  ]);
  return filas[0]?.total || 0;
};

module.exports = { deudasPorCliente, deudaCliente, pendienteCredito };
