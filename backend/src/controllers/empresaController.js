const Empresa = require('../models/Empresa');
const sifen = require('../services/sifen');

const CAMPOS = [
  'razonSocial',
  'nombreFantasia',
  'ruc',
  'direccion',
  'ciudad',
  'telefono',
  'email',
  'actividadEconomica',
  'timbrado',
  'establecimiento',
  'puntoExpedicion',
  'siguienteNumero',
];

const getEmpresa = async (req, res, next) => {
  try {
    res.json({ empresa: await Empresa.findOne(), modoSifen: sifen.modo() });
  } catch (error) {
    next(error);
  }
};

const updateEmpresa = async (req, res, next) => {
  try {
    const empresa = (await Empresa.findOne()) || new Empresa();
    CAMPOS.forEach((c) => req.body[c] !== undefined && empresa.set(c, req.body[c]));
    await empresa.save();
    res.json({ empresa, modoSifen: sifen.modo() });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmpresa, updateEmpresa };
