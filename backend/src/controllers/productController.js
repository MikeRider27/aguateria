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
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
