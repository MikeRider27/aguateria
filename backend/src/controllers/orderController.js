const Order = require('../models/Order');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Zone = require('../models/Zone');
const EnvaseMovimiento = require('../models/EnvaseMovimiento');
const { saldosPorCliente } = require('../services/envases');
const { deudaCliente, pendienteCredito } = require('../services/cuentas');
const { registrarCobro } = require('../services/cobros');
const { rangoDia } = require('../utils/fechas');

const poblar = (query) =>
  query
    .populate('cliente', 'nombre telefono whatsapp direccion barrio ciudad ubicacion')
    .populate('repartidor', 'nombre')
    .populate('zona', 'nombre');

const restaurarStock = async (order) => {
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.producto, { $inc: { stock: item.cantidad } });
  }
};

const getOrders = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.cliente) filtro.cliente = req.query.cliente;
    if (req.query.repartidor) filtro.repartidor = req.query.repartidor;
    if (req.query.zona) filtro.zona = req.query.zona;
    if (req.query.fecha) {
      const { inicio, fin } = rangoDia(req.query.fecha);
      filtro.fechaProgramada = { $gte: inicio, $lt: fin };
    }
    const orders = await poblar(Order.find(filtro)).sort({ fechaProgramada: -1, createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('cliente')
      .populate('repartidor', 'nombre email')
      .populate('zona', 'nombre')
      .populate('entregadoPor', 'nombre');
    if (!order) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc Crear pedido: valida stock, calcula totales (productos + garantias de envases) y descuenta inventario
// Nota: no usa transacciones multi-documento porque MongoDB corre como nodo
// unico (standalone) en docker-compose, que no las soporta.
const createOrder = async (req, res, next) => {
  try {
    const { cliente, items, metodoPago, direccionEntrega, notas, repartidor, fechaProgramada } = req.body;
    const condicion = req.body.condicion || null;

    if (!cliente || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: 'Cliente y al menos un item son requeridos' });
    }

    const clienteDoc = await Client.findById(cliente);
    if (!clienteDoc) {
      return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    }
    if (!clienteDoc.activo) {
      return res.status(400).json({ mensaje: 'El cliente esta inactivo' });
    }

    const productos = await Product.find({ _id: { $in: items.map((i) => i.producto) } });
    const productosPorId = new Map(productos.map((p) => [p._id.toString(), p]));

    const itemsConstruidos = [];
    let subtotalProductos = 0;
    let totalGarantias = 0;

    for (const item of items) {
      const producto = productosPorId.get(String(item.producto));
      const cantidad = Number(item.cantidad);
      if (!producto) {
        return res.status(404).json({ mensaje: `Producto ${item.producto} no encontrado` });
      }
      if (!Number.isInteger(cantidad) || cantidad < 1) {
        return res.status(400).json({ mensaje: `Cantidad invalida para ${producto.nombre}` });
      }
      if (producto.stock < cantidad) {
        return res
          .status(400)
          .json({ mensaje: `Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})` });
      }

      const garantias = producto.retornable ? Number(item.garantias || 0) : 0;
      if (!Number.isInteger(garantias) || garantias < 0 || garantias > cantidad) {
        return res
          .status(400)
          .json({ mensaje: `Las garantias de ${producto.nombre} deben estar entre 0 y la cantidad pedida` });
      }

      const subtotal = producto.precio * cantidad;
      const montoGarantia = producto.precioGarantia * garantias;
      subtotalProductos += subtotal;
      totalGarantias += montoGarantia;
      itemsConstruidos.push({
        producto: producto._id,
        nombreProducto: `${producto.nombre} ${producto.presentacion}`,
        cantidad,
        precioUnitario: producto.precio,
        subtotal,
        retornable: producto.retornable,
        iva: producto.iva,
        garantias,
        montoGarantia,
      });
    }

    // Condicion de venta: por defecto la del cliente; el credito solo para clientes habilitados
    const condicionFinal = condicion || clienteDoc.condicionVenta;
    if (condicionFinal === 'credito') {
      if (clienteDoc.condicionVenta !== 'credito') {
        return res.status(400).json({ mensaje: 'El cliente no esta habilitado para compras a credito' });
      }
      if (clienteDoc.limiteCredito > 0) {
        const comprometido = (await deudaCliente(clienteDoc._id)) + (await pendienteCredito(clienteDoc._id));
        const disponible = clienteDoc.limiteCredito - comprometido;
        if (subtotalProductos + totalGarantias > disponible) {
          return res.status(400).json({
            mensaje: `Supera el limite de credito del cliente (disponible: Gs. ${Math.max(disponible, 0).toLocaleString('es-PY')})`,
          });
        }
      }
    }

    // Descontar inventario de forma atomica por producto
    for (const [indice, item] of itemsConstruidos.entries()) {
      const actualizado = await Product.findOneAndUpdate(
        { _id: item.producto, stock: { $gte: item.cantidad } },
        { $inc: { stock: -item.cantidad } },
        { new: true }
      );
      if (!actualizado) {
        // revertir lo ya descontado si otro pedido tomo el stock primero
        for (const previo of itemsConstruidos.slice(0, indice)) {
          await Product.findByIdAndUpdate(previo.producto, { $inc: { stock: previo.cantidad } });
        }
        return res.status(409).json({ mensaje: `Stock insuficiente para ${item.nombreProducto}` });
      }
    }

    // Si no se indica repartidor, se usa el asignado a la zona del cliente
    let repartidorFinal = repartidor || null;
    if (!repartidorFinal && clienteDoc.zona) {
      const zona = await Zone.findById(clienteDoc.zona);
      repartidorFinal = zona?.repartidor || null;
    }

    let order;
    try {
      order = await Order.create({
        cliente,
        items: itemsConstruidos,
        subtotalProductos,
        totalGarantias,
        total: subtotalProductos + totalGarantias,
        metodoPago,
        condicion: condicionFinal,
        direccionEntrega: direccionEntrega || clienteDoc.direccion,
        notas,
        repartidor: repartidorFinal,
        zona: clienteDoc.zona || null,
        fechaProgramada: fechaProgramada ? new Date(`${fechaProgramada}T08:00:00`) : new Date(),
      });
    } catch (error) {
      await restaurarStock({ items: itemsConstruidos });
      throw error;
    }

    res.status(201).json(await poblar(Order.findById(order._id)));
  } catch (error) {
    next(error);
  }
};

// @desc Cambiar estado (pendiente / en_camino / cancelado) y/o repartidor.
// La entrega se registra con PATCH /:id/entregar porque mueve envases.
const updateOrderStatus = async (req, res, next) => {
  try {
    const { estado, repartidor } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ mensaje: 'Pedido no encontrado' });

    if (['entregado', 'cancelado'].includes(order.estado)) {
      return res.status(400).json({ mensaje: `El pedido ya esta ${order.estado} y no puede modificarse` });
    }
    if (estado === 'entregado') {
      return res.status(400).json({ mensaje: 'Use la opcion "Entregar" para registrar la entrega y los envases' });
    }
    if (estado === 'cancelado' && order.montoPagado > 0) {
      return res.status(400).json({ mensaje: 'El pedido tiene cobros registrados, anulelos antes de cancelar' });
    }

    const cambios = {};
    const filtroTransicion = { _id: order._id, estado: { $in: ['pendiente', 'en_camino'] } };
    if (estado === 'cancelado') filtroTransicion.montoPagado = 0;
    if (estado) cambios.estado = estado;
    if (repartidor !== undefined) cambios.repartidor = repartidor || null;

    // Transicion atomica: evita restaurar stock dos veces si se cancela en paralelo
    const actualizado = await Order.findOneAndUpdate(
      filtroTransicion,
      { $set: cambios },
      { new: true, runValidators: true }
    );
    if (!actualizado) return res.status(409).json({ mensaje: 'El pedido cambio de estado, recargue la pagina' });
    if (estado === 'cancelado') await restaurarStock(actualizado);

    res.json(await poblar(Order.findById(order._id)));
  } catch (error) {
    next(error);
  }
};

// @desc Confirmar entrega: registra envases llenos entregados y vacios retirados
// body: { retiros: [{ producto, cantidad }] }
const deliverOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    if (!['pendiente', 'en_camino'].includes(order.estado)) {
      return res.status(400).json({ mensaje: `El pedido ya esta ${order.estado}` });
    }

    const retiros = (req.body.retiros || [])
      .map((r) => ({ producto: String(r.producto), cantidad: Number(r.cantidad) }))
      .filter((r) => r.producto && r.cantidad > 0);

    const montoCobrado = Number(req.body.montoCobrado || 0);
    if (!Number.isInteger(montoCobrado) || montoCobrado < 0 || montoCobrado > order.total - order.montoPagado) {
      return res.status(400).json({ mensaje: 'El monto cobrado no puede superar el saldo del pedido' });
    }

    if (retiros.some((r) => !Number.isInteger(r.cantidad))) {
      return res.status(400).json({ mensaje: 'Las cantidades retiradas deben ser numeros enteros' });
    }

    const productosRetiro = await Product.find({ _id: { $in: retiros.map((r) => r.producto) } });
    const productosPorId = new Map(productosRetiro.map((p) => [p._id.toString(), p]));

    // Saldo disponible por producto = saldo previo del cliente + lo que se entrega en este pedido
    const saldos = await saldosPorCliente({ cliente: order.cliente });
    const disponible = new Map(saldos.map((s) => [s.producto.toString(), s.saldo]));
    order.items
      .filter((i) => i.retornable)
      .forEach((i) => {
        const id = i.producto.toString();
        disponible.set(id, (disponible.get(id) || 0) + i.cantidad);
      });

    const retirosConstruidos = [];
    for (const retiro of retiros) {
      const producto = productosPorId.get(retiro.producto);
      if (!producto || !producto.retornable) {
        return res.status(400).json({ mensaje: 'Solo se pueden retirar envases de productos retornables' });
      }
      const maximo = disponible.get(retiro.producto) || 0;
      if (retiro.cantidad > maximo) {
        return res.status(400).json({
          mensaje: `El cliente solo tiene ${maximo} envase(s) de ${producto.nombre} para devolver`,
        });
      }
      retirosConstruidos.push({
        producto: producto._id,
        nombreProducto: `${producto.nombre} ${producto.presentacion}`,
        cantidad: retiro.cantidad,
      });
    }

    const movimientos = [
      ...order.items
        .filter((i) => i.retornable)
        .map((i) => ({ producto: i.producto, tipo: 'entrega', cantidad: i.cantidad })),
      ...retirosConstruidos.map((r) => ({ producto: r.producto, tipo: 'retiro', cantidad: -r.cantidad })),
    ].map((m) => ({ ...m, cliente: order.cliente, pedido: order._id, usuario: req.user._id }));

    // Transicion atomica: si dos usuarios confirman a la vez, solo uno mueve envases
    const cambios = {
      estado: 'entregado',
      envasesRetirados: retirosConstruidos,
      entregadoEn: new Date(),
      entregadoPor: req.user._id,
    };
    if (req.body.metodoPago) cambios.metodoPago = req.body.metodoPago;
    const entregado = await Order.findOneAndUpdate(
      { _id: order._id, estado: { $in: ['pendiente', 'en_camino'] } },
      { $set: cambios },
      { new: true, runValidators: true }
    );
    if (!entregado) return res.status(409).json({ mensaje: 'El pedido ya fue procesado por otro usuario' });

    if (movimientos.length > 0) await EnvaseMovimiento.insertMany(movimientos);
    for (const r of retirosConstruidos) {
      await Product.findByIdAndUpdate(r.producto, { $inc: { stockVacios: r.cantidad } });
    }

    // El dinero recibido en la entrega queda como cobro del repartidor (para su rendicion de caja)
    if (montoCobrado > 0) {
      await registrarCobro({
        cliente: order.cliente,
        monto: montoCobrado,
        metodo: entregado.metodoPago,
        referencia: req.body.referenciaPago,
        pedidos: [order._id],
        usuario: req.user._id,
      });
    }

    res.json(await poblar(Order.findById(order._id)));
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndDelete({
      _id: req.params.id,
      estado: { $ne: 'entregado' },
      montoPagado: 0,
    });
    if (!order) {
      const existe = await Order.exists({ _id: req.params.id });
      if (existe) {
        return res
          .status(400)
          .json({ mensaje: 'Un pedido entregado o con cobros registrados no puede eliminarse' });
      }
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }
    if (order.estado !== 'cancelado') await restaurarStock(order);
    res.json({ mensaje: 'Pedido eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOrders, getOrder, createOrder, updateOrderStatus, deliverOrder, deleteOrder };
