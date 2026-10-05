const Order = require('../models/Order');
const Product = require('../models/Product');

const getProducts = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.activo !== undefined) filtro.activo = req.query.activo === 'true';
    const products = await Product.find(filtro).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const usado = await Order.exists({ 'items.producto': req.params.id });
    if (usado) {
      return res
        .status(400)
        .json({ mensaje: 'El producto tiene pedidos registrados, desactivelo en lugar de eliminarlo' });
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    next(error);
  }
};

// @desc Movimientos internos de envases retornables en planta
// llenado: vacios -> llenos | baja: vacios -> danados | ingreso: compra de envases nuevos (vacios)
// descarte: elimina envases danados
const OPERACIONES_ENVASE = {
  llenado: { stockVacios: -1, stock: 1 },
  baja: { stockVacios: -1, stockDanados: 1 },
  ingreso: { stockVacios: 1 },
  descarte: { stockDanados: -1 },
};

const moverEnvases = async (req, res, next) => {
  try {
    const { operacion } = req.body;
    const cantidad = Number(req.body.cantidad);
    const efecto = OPERACIONES_ENVASE[operacion];
    if (!efecto) return res.status(400).json({ mensaje: 'Operacion de envases invalida' });
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser un entero positivo' });
    }

    const filtro = { _id: req.params.id, retornable: true };
    const inc = {};
    Object.entries(efecto).forEach(([campo, signo]) => {
      inc[campo] = signo * cantidad;
      if (signo < 0) filtro[campo] = { $gte: cantidad };
    });

    const product = await Product.findOneAndUpdate(filtro, { $inc: inc }, { new: true });
    if (!product) {
      const existe = await Product.findById(req.params.id);
      if (!existe) return res.status(404).json({ mensaje: 'Producto no encontrado' });
      if (!existe.retornable) return res.status(400).json({ mensaje: 'El producto no es retornable' });
      return res.status(400).json({ mensaje: 'No hay suficientes envases para esa operacion' });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, moverEnvases };
