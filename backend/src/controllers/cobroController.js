const Cobro = require('../models/Cobro');
const { registrarCobro, anularCobro } = require('../services/cobros');
const { rangoDia } = require('../utils/fechas');

const poblar = (q) =>
  q
    .populate('cliente', 'nombre tipoDocumento documento dv')
    .populate('usuario', 'nombre')
    .populate('aplicaciones.pedido', 'fechaProgramada total montoPagado');

const getCobros = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.cliente) filtro.cliente = req.query.cliente;
    if (req.query.usuario) filtro.usuario = req.query.usuario;
    if (req.query.desde || req.query.hasta) {
      filtro.createdAt = {};
      if (req.query.desde) filtro.createdAt.$gte = rangoDia(req.query.desde).inicio;
      if (req.query.hasta) filtro.createdAt.$lt = rangoDia(req.query.hasta).fin;
    }
    // Un repartidor solo ve los cobros que el mismo recibio
    if (req.user.rol === 'repartidor') filtro.usuario = req.user._id;
    const cobros = await poblar(Cobro.find(filtro)).sort({ createdAt: -1 }).limit(500);
    res.json(cobros);
  } catch (error) {
    next(error);
  }
};

const getCobro = async (req, res, next) => {
  try {
    const cobro = await poblar(Cobro.findById(req.params.id)).populate('cliente');
    if (!cobro) return res.status(404).json({ mensaje: 'Cobro no encontrado' });
    res.json(cobro);
  } catch (error) {
    next(error);
  }
};

const createCobro = async (req, res, next) => {
  try {
    const { cliente, monto, metodo, referencia, pedidos } = req.body;
    if (!cliente || !metodo) return res.status(400).json({ mensaje: 'Cliente y metodo de pago son requeridos' });
    const cobro = await registrarCobro({ cliente, monto, metodo, referencia, pedidos, usuario: req.user._id });
    res.status(201).json(await poblar(Cobro.findById(cobro._id)));
  } catch (error) {
    next(error);
  }
};

const anular = async (req, res, next) => {
  try {
    const cobro = await anularCobro({ id: req.params.id, usuario: req.user._id, motivo: req.body.motivo });
    res.json(cobro);
  } catch (error) {
    next(error);
  }
};

module.exports = { getCobros, getCobro, createCobro, anular };
