const Cobro = require('../models/Cobro');
const CierreCaja = require('../models/CierreCaja');
const User = require('../models/User');
const { METODOS_COBRO } = require('../models/Cobro');

const totalizar = (cobros) => {
  const totales = Object.fromEntries(METODOS_COBRO.map((m) => [m, 0]));
  cobros.forEach((c) => (totales[c.metodo] += c.monto));
  return { totales, total: cobros.reduce((a, c) => a + c.monto, 0) };
};

// @desc Cobros aun no rendidos, agrupados por usuario que recibio el dinero
const getPendientes = async (req, res, next) => {
  try {
    const filtro = { cierre: null, anulado: false };
    if (req.user.rol === 'repartidor') filtro.usuario = req.user._id;
    const cobros = await Cobro.find(filtro)
      .populate('cliente', 'nombre')
      .sort({ createdAt: 1 });

    const porUsuario = new Map();
    cobros.forEach((c) => {
      const id = c.usuario.toString();
      if (!porUsuario.has(id)) porUsuario.set(id, []);
      porUsuario.get(id).push(c);
    });
    const usuarios = await User.find({ _id: { $in: [...porUsuario.keys()] } }).select('nombre rol');

    res.json(
      usuarios.map((u) => {
        const lista = porUsuario.get(u._id.toString());
        return { usuario: u, cobros: lista, ...totalizar(lista) };
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc Cerrar caja de un usuario: rinde todos sus cobros pendientes
const cerrarCaja = async (req, res, next) => {
  try {
    const { usuario, observacion } = req.body;
    const efectivoDeclarado = Number(req.body.efectivoDeclarado);
    if (!usuario) return res.status(400).json({ mensaje: 'Indique el usuario que rinde' });
    if (!Number.isInteger(efectivoDeclarado) || efectivoDeclarado < 0) {
      return res.status(400).json({ mensaje: 'El efectivo declarado debe ser un monto entero' });
    }

    const cobros = await Cobro.find({ usuario, cierre: null, anulado: false });
    if (cobros.length === 0) return res.status(400).json({ mensaje: 'El usuario no tiene cobros pendientes de rendir' });

    const { totales, total } = totalizar(cobros);
    const cierre = new CierreCaja({
      usuario,
      recibidoPor: req.user._id,
      cobros: cobros.map((c) => c._id),
      totales,
      total,
      efectivoDeclarado,
      diferencia: efectivoDeclarado - totales.efectivo,
      observacion,
    });

    // Marcar los cobros como rendidos solo si nadie los rindio en paralelo
    const marcados = await Cobro.updateMany(
      { _id: { $in: cierre.cobros }, cierre: null, anulado: false },
      { $set: { cierre: cierre._id } }
    );
    if (marcados.modifiedCount !== cobros.length) {
      await Cobro.updateMany({ cierre: cierre._id }, { $set: { cierre: null } });
      return res.status(409).json({ mensaje: 'Los cobros cambiaron mientras se cerraba la caja, intente de nuevo' });
    }
    await cierre.save();

    res.status(201).json(await cierre.populate([{ path: 'usuario', select: 'nombre' }, { path: 'recibidoPor', select: 'nombre' }]));
  } catch (error) {
    next(error);
  }
};

const getCierres = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.user.rol === 'repartidor') filtro.usuario = req.user._id;
    else if (req.query.usuario) filtro.usuario = req.query.usuario;
    const cierres = await CierreCaja.find(filtro)
      .populate('usuario', 'nombre')
      .populate('recibidoPor', 'nombre')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(cierres);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPendientes, cerrarCaja, getCierres };
