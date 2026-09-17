const Order = require('../models/Order');
const Product = require('../models/Product');
const Client = require('../models/Client');

const getOrders = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.cliente) filtro.cliente = req.query.cliente;
    const orders = await Order.find(filtro)
      .populate('cliente', 'nombre telefono direccion')
      .populate('repartidor', 'nombre')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('cliente')
      .populate('repartidor', 'nombre email');
    if (!order) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc Crear pedido: valida stock, calcula totales y descuenta inventario
// Nota: no usa transacciones multi-documento porque MongoDB corre como nodo
// unico (standalone) en docker-compose, que no las soporta.
const createOrder = async (req, res, next) => {
  try {
    const { cliente, items, metodoPago, direccionEntrega, notas, repartidor } = req.body;

    if (!cliente || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: 'Cliente y al menos un item son requeridos' });
    }

    const clienteDoc = await Client.findById(cliente);
    if (!clienteDoc) {
      return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    }

    const productos = await Product.find({ _id: { $in: items.map((i) => i.producto) } });
    const productosPorId = new Map(productos.map((p) => [p._id.toString(), p]));

    const itemsConstruidos = [];
    let total = 0;

    for (const item of items) {
      const producto = productosPorId.get(item.producto);
      if (!producto) {
        return res.status(404).json({ mensaje: `Producto ${item.producto} no encontrado` });
      }
      if (producto.stock < item.cantidad) {
        return res
          .status(400)
          .json({ mensaje: `Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})` });
      }

      const subtotal = producto.precio * item.cantidad;
      total += subtotal;
      itemsConstruidos.push({
        producto: producto._id,
        nombreProducto: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: producto.precio,
        subtotal,
      });
    }

    // Descontar inventario de forma atomica por producto
    for (const item of itemsConstruidos) {
      const actualizado = await Product.findOneAndUpdate(
        { _id: item.producto, stock: { $gte: item.cantidad } },
        { $inc: { stock: -item.cantidad } },
        { new: true }
      );
      if (!actualizado) {
        // revertir lo ya descontado si otro pedido tomo el stock primero
        const yaDescontados = itemsConstruidos.slice(0, itemsConstruidos.indexOf(item));
        for (const previo of yaDescontados) {
          await Product.findByIdAndUpdate(previo.producto, { $inc: { stock: previo.cantidad } });
        }
        return res.status(409).json({ mensaje: `Stock insuficiente para ${item.nombreProducto}` });
      }
    }

    const order = await Order.create({
      cliente,
      items: itemsConstruidos,
      total,
      metodoPago,
      direccionEntrega: direccionEntrega || clienteDoc.direccion,
      notas,
      repartidor: repartidor || null,
    });

    const orderPopulado = await Order.findById(order._id)
      .populate('cliente', 'nombre telefono direccion')
      .populate('repartidor', 'nombre');

    res.status(201).json(orderPopulado);
  } catch (error) {
    next(error);
  }
};

// @desc Actualizar estado del pedido (y repartidor asignado)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { estado, repartidor } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ mensaje: 'Pedido no encontrado' });

    if (estado === 'cancelado' && order.estado !== 'cancelado') {
      // restaurar stock si se cancela un pedido activo
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.producto, { $inc: { stock: item.cantidad } });
      }
    }

    if (estado) order.estado = estado;
    if (repartidor !== undefined) order.repartidor = repartidor || null;
    await order.save();

    const orderPopulado = await Order.findById(order._id)
      .populate('cliente', 'nombre telefono direccion')
      .populate('repartidor', 'nombre');

    res.json(orderPopulado);
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ mensaje: 'Pedido no encontrado' });

    if (order.estado !== 'cancelado') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.producto, { $inc: { stock: item.cantidad } });
      }
    }
    await order.deleteOne();
    res.json({ mensaje: 'Pedido eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOrders, getOrder, createOrder, updateOrderStatus, deleteOrder };
