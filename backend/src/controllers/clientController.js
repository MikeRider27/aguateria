const Client = require('../models/Client');
const Order = require('../models/Order');
const Product = require('../models/Product');
const EnvaseMovimiento = require('../models/EnvaseMovimiento');
const { saldosPorCliente } = require('../services/envases');

const CAMPOS = [
  'tipo',
  'nombre',
  'tipoDocumento',
  'documento',
  'telefono',
  'whatsapp',
  'email',
  'direccion',
  'barrio',
  'ciudad',
  'referencia',
  'zona',
  'ubicacion',
  'activo',
];

// Condiciones de credito: solo las define administracion
const CAMPOS_CREDITO = ['condicionVenta', 'limiteCredito', 'plazoDias'];

const tomarCampos = (body, user) => {
  const datos = {};
  const permitidos = ['admin', 'cajero'].includes(user.rol) ? [...CAMPOS, ...CAMPOS_CREDITO] : CAMPOS;
  permitidos.forEach((c) => body[c] !== undefined && (datos[c] = body[c]));
  if (datos.zona === '') datos.zona = null;
  return datos;
};

const getClients = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.q) {
      const q = req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filtro.$or = [
        { nombre: { $regex: q, $options: 'i' } },
        { telefono: { $regex: q, $options: 'i' } },
        { documento: { $regex: q, $options: 'i' } },
        { barrio: { $regex: q, $options: 'i' } },
      ];
    }
    if (req.query.zona) filtro.zona = req.query.zona;
    if (req.query.activo !== undefined) filtro.activo = req.query.activo === 'true';

    const [clients, saldos] = await Promise.all([
      Client.find(filtro).populate('zona', 'nombre').sort({ createdAt: -1 }),
      saldosPorCliente(),
    ]);

    // Total de envases en poder de cada cliente
    const envasesPorCliente = new Map();
    saldos.forEach((s) => {
      const id = s.cliente.toString();
      envasesPorCliente.set(id, (envasesPorCliente.get(id) || 0) + s.saldo);
    });

    res.json(
      clients.map((c) => ({ ...c.toJSON(), envasesEnPoder: envasesPorCliente.get(c._id.toString()) || 0 }))
    );
  } catch (error) {
    next(error);
  }
};

const getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id).populate('zona', 'nombre');
    if (!client) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    const client = await Client.create(tomarCampos(req.body, req.user));
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

// Se usa find + save (no findByIdAndUpdate) para que corra el calculo del DV del RUC
const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    client.set(tomarCampos(req.body, req.user));
    await client.save();
    res.json(client);
  } catch (error) {
    next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    const [pedidos, movimientos] = await Promise.all([
      Order.countDocuments({ cliente: req.params.id }),
      EnvaseMovimiento.countDocuments({ cliente: req.params.id }),
    ]);
    if (pedidos > 0 || movimientos > 0) {
      return res
        .status(400)
        .json({ mensaje: 'El cliente tiene pedidos o envases registrados, desactivelo en lugar de eliminarlo' });
    }
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (error) {
    next(error);
  }
};

// @desc Saldo de envases del cliente por producto, garantias pagadas e historial
const getClientEnvases = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    const [saldos, movimientos, garantiasAgg] = await Promise.all([
      saldosPorCliente({ cliente: client._id }),
      EnvaseMovimiento.find({ cliente: client._id })
        .populate('producto', 'nombre presentacion')
        .populate('usuario', 'nombre')
        .sort({ createdAt: -1 })
        .limit(100),
      Order.aggregate([
        { $match: { cliente: client._id, estado: 'entregado' } },
        { $group: { _id: null, total: { $sum: '$totalGarantias' } } },
      ]),
    ]);

    const productos = await Product.find({ _id: { $in: saldos.map((s) => s.producto) } }).select(
      'nombre presentacion'
    );
    const porId = new Map(productos.map((p) => [p._id.toString(), p]));

    res.json({
      saldos: saldos.map((s) => ({ ...s, producto: porId.get(s.producto.toString()) })),
      garantiasPagadas: garantiasAgg[0]?.total || 0,
      movimientos,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient, getClientEnvases };
