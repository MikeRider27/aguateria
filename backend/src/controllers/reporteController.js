const Order = require('../models/Order');
const Client = require('../models/Client');
const Equipo = require('../models/Equipo');
const { rangoDia } = require('../utils/fechas');

const DIA_MS = 24 * 60 * 60 * 1000;

const rango = (query) => {
  const hasta = query.hasta ? rangoDia(query.hasta).fin : rangoDia().fin;
  const desde = query.desde ? rangoDia(query.desde).inicio : new Date(hasta.getTime() - 30 * DIA_MS);
  return { desde, hasta };
};

// @desc Ventas de pedidos entregados en el periodo: resumen, por zona, repartidor, producto y dia
const getVentas = async (req, res, next) => {
  try {
    const { desde, hasta } = rango(req.query);
    const match = { estado: 'entregado', entregadoEn: { $gte: desde, $lt: hasta } };
    const bidones = { $sum: { $map: { input: '$items', as: 'i', in: { $cond: ['$$i.retornable', '$$i.cantidad', 0] } } } };

    const agrupar = (campo, coleccion, nombre) => [
      { $match: match },
      { $group: { _id: `$${campo}`, ventas: { $sum: '$subtotalProductos' }, pedidos: { $sum: 1 }, bidones: { $sum: bidones } } },
      { $lookup: { from: coleccion, localField: '_id', foreignField: '_id', as: 'ref' } },
      { $project: { ventas: 1, pedidos: 1, bidones: 1, nombre: { $ifNull: [{ $first: `$ref.${nombre}` }, 'Sin asignar'] } } },
      { $sort: { ventas: -1 } },
    ];

    const [resumen, porZona, porRepartidor, porProducto, porDia] = await Promise.all([
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            ventas: { $sum: '$subtotalProductos' },
            garantias: { $sum: '$totalGarantias' },
            pedidos: { $sum: 1 },
            bidones: { $sum: bidones },
            clientes: { $addToSet: '$cliente' },
          },
        },
        { $project: { _id: 0, ventas: 1, garantias: 1, pedidos: 1, bidones: 1, clientes: { $size: '$clientes' } } },
      ]),
      Order.aggregate(agrupar('zona', 'zones', 'nombre')),
      Order.aggregate(agrupar('repartidor', 'users', 'nombre')),
      Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.nombreProducto',
            cantidad: { $sum: '$items.cantidad' },
            ventas: { $sum: '$items.subtotal' },
          },
        },
        { $project: { _id: 0, nombre: '$_id', cantidad: 1, ventas: 1 } },
        { $sort: { ventas: -1 } },
      ]),
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$entregadoEn', timezone: process.env.TZ || 'UTC' } },
            ventas: { $sum: '$subtotalProductos' },
            pedidos: { $sum: 1 },
          },
        },
        { $project: { _id: 0, dia: '$_id', ventas: 1, pedidos: 1 } },
        { $sort: { dia: 1 } },
      ]),
    ]);

    const r = resumen[0] || { ventas: 0, garantias: 0, pedidos: 0, bidones: 0, clientes: 0 };
    res.json({
      desde,
      hasta,
      resumen: { ...r, ticketPromedio: r.pedidos ? Math.round(r.ventas / r.pedidos) : 0 },
      porZona,
      porRepartidor,
      porProducto,
      porDia,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Clientes activos sin pedidos entregados en los ultimos N dias (o que nunca compraron)
const getClientesInactivos = async (req, res, next) => {
  try {
    const dias = Number(req.query.dias) || 30;
    const limite = new Date(Date.now() - dias * DIA_MS);

    const ultimos = await Order.aggregate([
      { $match: { estado: 'entregado' } },
      { $group: { _id: '$cliente', ultimaCompra: { $max: '$entregadoEn' }, compras: { $sum: 1 } } },
    ]);
    const porCliente = new Map(ultimos.map((u) => [u._id.toString(), u]));

    const clientes = await Client.find({ activo: true })
      .select('nombre telefono whatsapp barrio ciudad zona createdAt')
      .populate('zona', 'nombre');

    const filas = clientes
      .map((c) => {
        const u = porCliente.get(c._id.toString());
        return { cliente: c, ultimaCompra: u?.ultimaCompra || null, compras: u?.compras || 0 };
      })
      // Un cliente nuevo que todavia no compro no cuenta como inactivo hasta que pase el periodo
      .filter((f) => (f.ultimaCompra || f.cliente.createdAt) < limite)
      .sort((a, b) => new Date(a.ultimaCompra || 0) - new Date(b.ultimaCompra || 0));

    res.json(filas);
  } catch (error) {
    next(error);
  }
};

// @desc Equipos en comodato: consumo de bidones de los ultimos 30 dias contra el minimo pactado
const getComodatos = async (req, res, next) => {
  try {
    const desde = new Date(Date.now() - 30 * DIA_MS);
    const equipos = await Equipo.find({ estado: 'comodato' })
      .populate('cliente', 'nombre telefono whatsapp')
      .sort({ codigo: 1 });

    const consumos = await Order.aggregate([
      { $match: { estado: 'entregado', entregadoEn: { $gte: desde }, cliente: { $in: equipos.map((e) => e.cliente?._id).filter(Boolean) } } },
      { $unwind: '$items' },
      { $match: { 'items.retornable': true } },
      { $group: { _id: '$cliente', bidones: { $sum: '$items.cantidad' } } },
    ]);
    const porCliente = new Map(consumos.map((c) => [c._id.toString(), c.bidones]));

    // Si un cliente tiene varios equipos, el minimo exigido es la suma de los minimos
    const minimoPorCliente = new Map();
    equipos.forEach((e) => {
      const id = e.cliente?._id?.toString();
      if (id) minimoPorCliente.set(id, (minimoPorCliente.get(id) || 0) + (e.contrato?.consumoMinimoMensual || 0));
    });

    res.json(
      equipos.map((e) => {
        const id = e.cliente?._id?.toString();
        const consumo = porCliente.get(id) || 0;
        const minimo = minimoPorCliente.get(id) || 0;
        return {
          equipo: { _id: e._id, codigo: e.codigo, tipo: e.tipo, marca: e.marca, proximoMantenimiento: e.proximoMantenimiento },
          cliente: e.cliente,
          desde: e.contrato?.fechaInicio,
          consumo30Dias: consumo,
          minimoMensual: minimo,
          cumple: consumo >= minimo,
        };
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { getVentas, getClientesInactivos, getComodatos };
