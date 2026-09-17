const Order = require('../models/Order');
const Product = require('../models/Product');
const Client = require('../models/Client');

const getStats = async (req, res, next) => {
  try {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [ventasHoyAgg, pedidosPendientes, pedidosEnCamino, totalClientes, productos] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: inicioHoy }, estado: { $ne: 'cancelado' } } },
        { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } },
      ]),
      Order.countDocuments({ estado: 'pendiente' }),
      Order.countDocuments({ estado: 'en_camino' }),
      Client.countDocuments({ activo: true }),
      Product.find({ activo: true }),
    ]);

    const productosStockBajo = productos.filter((p) => p.stock <= p.stockMinimo);

    res.json({
      ventasHoy: ventasHoyAgg[0]?.total || 0,
      pedidosHoy: ventasHoyAgg[0]?.cantidad || 0,
      pedidosPendientes,
      pedidosEnCamino,
      totalClientes,
      productosStockBajo: productosStockBajo.map((p) => ({
        _id: p._id,
        nombre: p.nombre,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
