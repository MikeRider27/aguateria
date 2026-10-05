const Order = require('../models/Order');
const Product = require('../models/Product');
const Client = require('../models/Client');
const { rangoDia } = require('../utils/fechas');
const { totalesEnClientes } = require('../services/envases');
const { deudasPorCliente } = require('../services/cuentas');
const Cobro = require('../models/Cobro');
const Equipo = require('../models/Equipo');
const Suscripcion = require('../models/Suscripcion');

const getStats = async (req, res, next) => {
  try {
    const { inicio, fin } = rangoDia();

    const [ventasHoyAgg, pedidosParaHoy, pedidosPendientes, pedidosEnCamino, totalClientes, productos, enClientes] =
      await Promise.all([
        Order.aggregate([
          { $match: { entregadoEn: { $gte: inicio, $lt: fin }, estado: 'entregado' } },
          { $group: { _id: null, total: { $sum: '$subtotalProductos' }, cantidad: { $sum: 1 } } },
        ]),
        Order.countDocuments({ fechaProgramada: { $gte: inicio, $lt: fin }, estado: { $ne: 'cancelado' } }),
        Order.countDocuments({ estado: 'pendiente' }),
        Order.countDocuments({ estado: 'en_camino' }),
        Client.countDocuments({ activo: true }),
        Product.find({ activo: true }),
        totalesEnClientes(),
      ]);

    const [deudas, cobrosHoyAgg, equiposComodato, suscripcionesActivas] = await Promise.all([
      deudasPorCliente(),
      Cobro.aggregate([
        { $match: { createdAt: { $gte: inicio, $lt: fin }, anulado: false } },
        { $group: { _id: null, total: { $sum: '$monto' } } },
      ]),
      Equipo.find({ estado: 'comodato' }).select('estado ultimoMantenimiento contrato frecuenciaMantenimientoDias'),
      Suscripcion.countDocuments({ activa: true }),
    ]);
    const mantenimientosVencidos = equiposComodato.filter(
      (e) => e.proximoMantenimiento && e.proximoMantenimiento <= new Date()
    ).length;

    const productosStockBajo = productos.filter((p) => p.stock <= p.stockMinimo);
    const retornables = productos.filter((p) => p.retornable);

    res.json({
      ventasHoy: ventasHoyAgg[0]?.total || 0,
      entregasHoy: ventasHoyAgg[0]?.cantidad || 0,
      pedidosParaHoy,
      pedidosPendientes,
      pedidosEnCamino,
      totalClientes,
      porCobrar: deudas.reduce((a, d) => a + d.saldo, 0),
      clientesConDeuda: deudas.length,
      cobrosHoy: cobrosHoyAgg[0]?.total || 0,
      equiposEnComodato: equiposComodato.length,
      mantenimientosVencidos,
      suscripcionesActivas,
      envasesEnClientes: [...enClientes.values()].reduce((a, b) => a + b, 0),
      envasesVacios: retornables.reduce((a, p) => a + p.stockVacios, 0),
      productosStockBajo: productosStockBajo.map((p) => ({
        _id: p._id,
        nombre: `${p.nombre} ${p.presentacion}`,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
