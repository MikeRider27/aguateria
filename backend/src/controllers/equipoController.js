const Equipo = require('../models/Equipo');
const Client = require('../models/Client');

const CAMPOS = ['codigo', 'tipo', 'marca', 'modelo', 'numeroSerie', 'frecuenciaMantenimientoDias', 'notas'];

const poblar = (q) => q.populate('cliente', 'nombre telefono whatsapp direccion zona').populate('historial.usuario', 'nombre');

const errorEstado = (res, equipo, esperado) =>
  res.status(400).json({ mensaje: `El equipo esta en estado "${equipo.estado}" (se esperaba ${esperado})` });

const getEquipos = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.cliente) filtro.cliente = req.query.cliente;
    let equipos = await poblar(Equipo.find(filtro)).sort({ codigo: 1 });
    if (req.query.mantenimientoVencido === 'true') {
      const ahora = Date.now();
      equipos = equipos.filter((e) => e.proximoMantenimiento && e.proximoMantenimiento.getTime() <= ahora);
    }
    res.json(equipos);
  } catch (error) {
    next(error);
  }
};

const getEquipo = async (req, res, next) => {
  try {
    const equipo = await poblar(Equipo.findById(req.params.id)).populate('historial.cliente', 'nombre');
    if (!equipo) return res.status(404).json({ mensaje: 'Equipo no encontrado' });
    res.json(equipo);
  } catch (error) {
    next(error);
  }
};

const createEquipo = async (req, res, next) => {
  try {
    const datos = {};
    CAMPOS.forEach((c) => req.body[c] !== undefined && (datos[c] = req.body[c]));
    datos.historial = [{ tipo: 'alta', usuario: req.user._id, observacion: 'Alta del equipo' }];
    const equipo = await Equipo.create(datos);
    res.status(201).json(equipo);
  } catch (error) {
    next(error);
  }
};

const updateEquipo = async (req, res, next) => {
  try {
    const equipo = await Equipo.findById(req.params.id);
    if (!equipo) return res.status(404).json({ mensaje: 'Equipo no encontrado' });
    CAMPOS.forEach((c) => req.body[c] !== undefined && equipo.set(c, req.body[c]));
    if (equipo.estado === 'comodato' && req.body.contrato) {
      ['numero', 'consumoMinimoMensual', 'montoGarantia'].forEach(
        (c) => req.body.contrato[c] !== undefined && equipo.set(`contrato.${c}`, req.body.contrato[c])
      );
    }
    await equipo.save();
    res.json(await poblar(Equipo.findById(equipo._id)));
  } catch (error) {
    next(error);
  }
};

// @desc Entregar el equipo a un cliente en comodato
const asignar = async (req, res, next) => {
  try {
    const { cliente, contrato = {}, observacion } = req.body;
    const clienteDoc = await Client.findById(cliente);
    if (!clienteDoc) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    const equipo = await Equipo.findOneAndUpdate(
      { _id: req.params.id, estado: 'disponible' },
      {
        $set: {
          estado: 'comodato',
          cliente: clienteDoc._id,
          contrato: {
            numero: contrato.numero,
            fechaInicio: new Date(),
            consumoMinimoMensual: Number(contrato.consumoMinimoMensual || 0),
            montoGarantia: Number(contrato.montoGarantia || 0),
          },
          ultimoMantenimiento: null,
        },
        $push: { historial: { tipo: 'entrega', cliente: clienteDoc._id, usuario: req.user._id, observacion } },
      },
      { new: true, runValidators: true }
    );
    if (!equipo) {
      const existe = await Equipo.findById(req.params.id);
      if (!existe) return res.status(404).json({ mensaje: 'Equipo no encontrado' });
      return errorEstado(res, existe, '"disponible"');
    }
    res.json(await poblar(Equipo.findById(equipo._id)));
  } catch (error) {
    next(error);
  }
};

// @desc Retirar el equipo del cliente. Vuelve a planta para sanitizar antes de prestarlo otra vez.
const devolver = async (req, res, next) => {
  try {
    const actual = await Equipo.findById(req.params.id);
    if (!actual) return res.status(404).json({ mensaje: 'Equipo no encontrado' });
    if (actual.estado !== 'comodato') return errorEstado(res, actual, '"comodato"');

    const equipo = await Equipo.findOneAndUpdate(
      { _id: actual._id, estado: 'comodato' },
      {
        $set: { estado: 'mantenimiento', cliente: null, contrato: {} },
        $push: {
          historial: { tipo: 'devolucion', cliente: actual.cliente, usuario: req.user._id, observacion: req.body.observacion },
        },
      },
      { new: true }
    );
    if (!equipo) return res.status(409).json({ mensaje: 'El equipo cambio de estado, recargue la pagina' });
    res.json(equipo);
  } catch (error) {
    next(error);
  }
};

// @desc Registrar sanitizacion o reparacion. Un equipo en planta queda disponible.
const registrarMantenimiento = async (req, res, next) => {
  try {
    const { tipo = 'sanitizacion', observacion } = req.body;
    if (!['sanitizacion', 'reparacion'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'Tipo de mantenimiento invalido' });
    }
    const equipo = await Equipo.findById(req.params.id);
    if (!equipo) return res.status(404).json({ mensaje: 'Equipo no encontrado' });
    if (equipo.estado === 'baja') return errorEstado(res, equipo, 'un equipo activo');

    equipo.ultimoMantenimiento = new Date();
    if (equipo.estado === 'mantenimiento' && tipo === 'sanitizacion') equipo.estado = 'disponible';
    equipo.historial.push({ tipo, cliente: equipo.cliente, usuario: req.user._id, observacion });
    await equipo.save();
    res.json(await poblar(Equipo.findById(equipo._id)));
  } catch (error) {
    next(error);
  }
};

const darDeBaja = async (req, res, next) => {
  try {
    const equipo = await Equipo.findOneAndUpdate(
      { _id: req.params.id, estado: { $in: ['disponible', 'mantenimiento'] } },
      {
        $set: { estado: 'baja' },
        $push: { historial: { tipo: 'baja', usuario: req.user._id, observacion: req.body.observacion } },
      },
      { new: true }
    );
    if (!equipo) {
      return res.status(400).json({ mensaje: 'Solo se dan de baja equipos en planta (retire primero el comodato)' });
    }
    res.json(equipo);
  } catch (error) {
    next(error);
  }
};

module.exports = { getEquipos, getEquipo, createEquipo, updateEquipo, asignar, devolver, registrarMantenimiento, darDeBaja };
