const Factura = require('../models/Factura');
const Empresa = require('../models/Empresa');
const { emitirFactura, anularFactura, enviarASifen } = require('../services/facturacion');
const sifen = require('../services/sifen');
const { rangoDia } = require('../utils/fechas');

const getFacturas = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.cliente) filtro.cliente = req.query.cliente;
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.desde || req.query.hasta) {
      filtro.fecha = {};
      if (req.query.desde) filtro.fecha.$gte = rangoDia(req.query.desde).inicio;
      if (req.query.hasta) filtro.fecha.$lt = rangoDia(req.query.hasta).fin;
    }
    const facturas = await Factura.find(filtro).populate('usuario', 'nombre').sort({ fecha: -1 }).limit(500);
    res.json(facturas);
  } catch (error) {
    next(error);
  }
};

// Incluye los datos del emisor para imprimir la representacion grafica (KuDE)
const getFactura = async (req, res, next) => {
  try {
    const [factura, empresa] = await Promise.all([
      Factura.findById(req.params.id).populate('usuario', 'nombre'),
      Empresa.findOne(),
    ]);
    if (!factura) return res.status(404).json({ mensaje: 'Factura no encontrada' });
    res.json({ factura, empresa, modoSifen: sifen.modo() });
  } catch (error) {
    next(error);
  }
};

const createFactura = async (req, res, next) => {
  try {
    const factura = await emitirFactura({ pedidoIds: req.body.pedidos, usuario: req.user._id });
    res.status(201).json(factura);
  } catch (error) {
    next(error);
  }
};

const reenviar = async (req, res, next) => {
  try {
    const factura = await Factura.findById(req.params.id);
    if (!factura) return res.status(404).json({ mensaje: 'Factura no encontrada' });
    if (factura.estado === 'anulada') return res.status(400).json({ mensaje: 'La factura esta anulada' });
    if (['aprobado', 'simulado'].includes(factura.sifen?.estado)) {
      return res.status(400).json({ mensaje: 'La factura ya fue procesada por SIFEN' });
    }
    res.json(await enviarASifen(factura, await Empresa.findOne()));
  } catch (error) {
    next(error);
  }
};

const anular = async (req, res, next) => {
  try {
    res.json(await anularFactura({ id: req.params.id, motivo: req.body.motivo }));
  } catch (error) {
    next(error);
  }
};

module.exports = { getFacturas, getFactura, createFactura, reenviar, anular };
