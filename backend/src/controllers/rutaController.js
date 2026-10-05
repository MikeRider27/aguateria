const Order = require('../models/Order');
const Zone = require('../models/Zone');
const Client = require('../models/Client');
const { rangoDia, diaSemana } = require('../utils/fechas');

// @desc Hoja de ruta del dia: pedidos programados para la fecha mas los pendientes atrasados.
// Un repartidor solo ve su propia ruta.
const getHojaRuta = async (req, res, next) => {
  try {
    const { inicio, fin } = rangoDia(req.query.fecha);
    const repartidor = req.user.rol === 'repartidor' ? req.user._id : req.query.repartidor;

    const filtro = {
      $or: [
        { fechaProgramada: { $gte: inicio, $lt: fin } },
        { fechaProgramada: { $lt: inicio }, estado: { $in: ['pendiente', 'en_camino'] } },
      ],
      estado: { $ne: 'cancelado' },
    };
    if (repartidor === 'sin_asignar') filtro.repartidor = null;
    else if (repartidor) filtro.repartidor = repartidor;

    const pedidos = await Order.find(filtro)
      .populate('cliente', 'nombre telefono whatsapp direccion barrio ciudad referencia ubicacion')
      .populate('zona', 'nombre')
      .populate('repartidor', 'nombre')
      .lean();

    const orden = { en_camino: 0, pendiente: 1, entregado: 2 };
    pedidos.sort(
      (a, b) =>
        (a.zona?.nombre || '~').localeCompare(b.zona?.nombre || '~') ||
        orden[a.estado] - orden[b.estado] ||
        new Date(a.fechaProgramada) - new Date(b.fechaProgramada)
    );

    res.json({
      fecha: inicio,
      pedidos: pedidos.map((p) => ({ ...p, atrasado: new Date(p.fechaProgramada) < inicio })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc Clientes de las zonas que se visitan ese dia y que aun no tienen pedido para la fecha
const getVisitasSugeridas = async (req, res, next) => {
  try {
    const { inicio, fin } = rangoDia(req.query.fecha);
    const filtroZona = { activo: true, diasVisita: diaSemana(inicio) };
    if (req.user.rol === 'repartidor') filtroZona.repartidor = req.user._id;
    else if (req.query.repartidor) filtroZona.repartidor = req.query.repartidor;

    const zonas = await Zone.find(filtroZona).select('nombre');
    if (zonas.length === 0) return res.json([]);

    const conPedido = await Order.distinct('cliente', {
      fechaProgramada: { $gte: inicio, $lt: fin },
      estado: { $ne: 'cancelado' },
    });

    const clientes = await Client.find({
      zona: { $in: zonas.map((z) => z._id) },
      activo: true,
      _id: { $nin: conPedido },
    })
      .select('nombre telefono whatsapp direccion barrio zona')
      .populate('zona', 'nombre')
      .sort({ nombre: 1 });

    res.json(clientes);
  } catch (error) {
    next(error);
  }
};

module.exports = { getHojaRuta, getVisitasSugeridas };
