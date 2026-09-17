const Client = require('../models/Client');

const getClients = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.q) {
      filtro.$or = [
        { nombre: { $regex: req.query.q, $options: 'i' } },
        { telefono: { $regex: req.query.q, $options: 'i' } },
      ];
    }
    const clients = await Client.find(filtro).sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

const getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!client) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };
