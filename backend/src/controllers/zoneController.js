const Zone = require('../models/Zone');
const Client = require('../models/Client');

const getZones = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.activo !== undefined) filtro.activo = req.query.activo === 'true';
    const zonas = await Zone.find(filtro).populate('repartidor', 'nombre').sort({ nombre: 1 });
    res.json(zonas);
  } catch (error) {
    next(error);
  }
};

const createZone = async (req, res, next) => {
  try {
    const zona = await Zone.create(req.body);
    res.status(201).json(await zona.populate('repartidor', 'nombre'));
  } catch (error) {
    next(error);
  }
};

const updateZone = async (req, res, next) => {
  try {
    const zona = await Zone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('repartidor', 'nombre');
    if (!zona) return res.status(404).json({ mensaje: 'Zona no encontrada' });
    res.json(zona);
  } catch (error) {
    next(error);
  }
};

const deleteZone = async (req, res, next) => {
  try {
    const enUso = await Client.countDocuments({ zona: req.params.id });
    if (enUso > 0) {
      return res
        .status(400)
        .json({ mensaje: `La zona tiene ${enUso} cliente(s) asignados, desactivela en lugar de eliminarla` });
    }
    const zona = await Zone.findByIdAndDelete(req.params.id);
    if (!zona) return res.status(404).json({ mensaje: 'Zona no encontrada' });
    res.json({ mensaje: 'Zona eliminada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getZones, createZone, updateZone, deleteZone };
