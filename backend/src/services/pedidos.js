const Order = require('../models/Order');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Zone = require('../models/Zone');
const { deudaCliente, pendienteCredito } = require('./cuentas');
const { errorHttp } = require('./cobros');

const restaurarStock = async (order) => {
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.producto, { $inc: { stock: item.cantidad } });
  }
};

// fechaProgramada puede llegar como 'YYYY-MM-DD' (formulario) o Date (suscripciones)
const aFecha = (valor) => {
  if (!valor) return new Date();
  if (valor instanceof Date) return valor;
  return new Date(`${valor}T08:00:00`);
};

// Crea un pedido: valida stock, calcula totales (productos + garantias de envases),
// controla el limite de credito y descuenta inventario.
// Nota: no usa transacciones multi-documento porque MongoDB corre como nodo
// unico (standalone) en docker-compose, que no las soporta.
const crearPedido = async ({
  cliente,
  items,
  metodoPago,
  direccionEntrega,
  notas,
  repartidor,
  fechaProgramada,
  condicion = null,
  suscripcion = null,
}) => {
  if (!cliente || !items || !Array.isArray(items) || items.length === 0) {
    throw errorHttp(400, 'Cliente y al menos un item son requeridos');
  }

  const clienteDoc = await Client.findById(cliente);
  if (!clienteDoc) {
    throw errorHttp(404, 'Cliente no encontrado');
  }
  if (!clienteDoc.activo) {
    throw errorHttp(400, 'El cliente esta inactivo');
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
      throw errorHttp(404, `Producto ${item.producto} no encontrado`);
    }
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw errorHttp(400, `Cantidad invalida para ${producto.nombre}`);
    }
    if (producto.stock < cantidad) {
      throw errorHttp(400, `Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})`);
    }

    const garantias = producto.retornable ? Number(item.garantias || 0) : 0;
    if (!Number.isInteger(garantias) || garantias < 0 || garantias > cantidad) {
      throw errorHttp(400, `Las garantias de ${producto.nombre} deben estar entre 0 y la cantidad pedida`);
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
      throw errorHttp(400, 'El cliente no esta habilitado para compras a credito');
    }
    if (clienteDoc.limiteCredito > 0) {
      const comprometido = (await deudaCliente(clienteDoc._id)) + (await pendienteCredito(clienteDoc._id));
      const disponible = clienteDoc.limiteCredito - comprometido;
      if (subtotalProductos + totalGarantias > disponible) {
        const texto = Math.max(disponible, 0).toLocaleString('es-PY');
        throw errorHttp(400, `Supera el limite de credito del cliente (disponible: Gs. ${texto})`);
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
      throw errorHttp(409, `Stock insuficiente para ${item.nombreProducto}`);
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
      fechaProgramada: aFecha(fechaProgramada),
      suscripcion,
    });
  } catch (error) {
    await restaurarStock({ items: itemsConstruidos });
    throw error;
  }

  return order;
};


module.exports = { crearPedido, restaurarStock };
