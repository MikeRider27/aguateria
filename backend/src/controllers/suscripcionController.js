const Suscripcion = require('../models/Suscripcion');
const Client = require('../models/Client');
const { generarPedidos, primeraEntrega } = require('../services/suscripciones');
const { DIAS_SEMANA } = require('../utils/fechas');

const poblar = (q) =>
  q
    .populate('cliente', 'nombre telefono zona')
    .populate('items.producto', 'nombre presentacion precio')
    .populate('ultimoPedido', 'fechaProgramada estado');

const datosDe = (body) => {
  const datos = {};
  ['cliente', 'items', 'frecuencia', 'diaSemana', 'diaMes', 'notas', 'activa'].forEach(
    (c) => body[c] !== undefined && (datos[c] = body[c])
  );
  if (datos.frecuencia === 'mensual') datos.diaSemana = undefined;
  else if (datos.frecuencia) datos.diaMes = undefined;
  return datos;
};

// Validar el calendario antes de calcular la primera entrega
const errorCalendario = ({ frecuencia, diaSemana, diaMes }) => {
  if (!['semanal', 'quincenal', 'mensual'].includes(frecuencia)) return 'Frecuencia invalida';
  if (frecuencia === 'mensual') {
    const dia = Number(diaMes);
    return Number.isInteger(dia) && dia >= 1 && dia <= 28 ? null : 'Indique el dia del mes (1 a 28)';
  }
  return DIAS_SEMANA.includes(diaSemana) ? null : 'Indique el dia de la semana';
};

const getSuscripciones = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.activa !== undefined) filtro.activa = req.query.activa === 'true';
    if (req.query.cliente) filtro.cliente = req.query.cliente;
    res.json(await poblar(Suscripcion.find(filtro)).sort({ proximaEntrega: 1 }));
  } catch (error) {
    next(error);
  }
};

const createSuscripcion = async (req, res, next) => {
  try {
    const datos = datosDe(req.body);
    const invalido = errorCalendario(datos);
    if (invalido) return res.status(400).json({ mensaje: invalido });
    if (!(await Client.exists({ _id: datos.cliente }))) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    datos.proximaEntrega = req.body.desde
      ? primeraEntrega(datos, new Date(`${req.body.desde}T00:00:00`))
      : primeraEntrega(datos);
    const s = await Suscripcion.create(datos);
    res.status(201).json(await poblar(Suscripcion.findById(s._id)));
  } catch (error) {
    next(error);
  }
};

const updateSuscripcion = async (req, res, next) => {
  try {
    const s = await Suscripcion.findById(req.params.id);
    if (!s) return res.status(404).json({ mensaje: 'Suscripcion no encontrada' });
    const datos = datosDe(req.body);
    delete datos.cliente;
    const cambiaCalendario = ['frecuencia', 'diaSemana', 'diaMes'].some(
      (c) => datos[c] !== undefined && String(datos[c]) !== String(s[c])
    );
    const reactivada = datos.activa === true && !s.activa;
    const invalido = errorCalendario({
      frecuencia: datos.frecuencia ?? s.frecuencia,
      diaSemana: datos.frecuencia === 'mensual' ? undefined : datos.diaSemana ?? s.diaSemana,
      diaMes: datos.frecuencia && datos.frecuencia !== 'mensual' ? undefined : datos.diaMes ?? s.diaMes,
    });
    if (invalido) return res.status(400).json({ mensaje: invalido });
    s.set(datos);
    // Recalcular la proxima entrega si cambia el calendario o se reactiva
    if (cambiaCalendario || reactivada) s.proximaEntrega = primeraEntrega(s);
    await s.save();
    res.json(await poblar(Suscripcion.findById(s._id)));
  } catch (error) {
    next(error);
  }
};

const deleteSuscripcion = async (req, res, next) => {
  try {
    const s = await Suscripcion.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ mensaje: 'Suscripcion no encontrada' });
    res.json({ mensaje: 'Suscripcion eliminada' });
  } catch (error) {
    next(error);
  }
};

// @desc Generar ahora los pedidos de suscripciones (tambien corre automaticamente cada hora)
const generar = async (req, res, next) => {
  try {
    res.json(await generarPedidos());
  } catch (error) {
    next(error);
  }
};

module.exports = { getSuscripciones, createSuscripcion, updateSuscripcion, deleteSuscripcion, generar };
