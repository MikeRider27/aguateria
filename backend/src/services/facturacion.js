const mongoose = require('mongoose');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Empresa = require('../models/Empresa');
const Factura = require('../models/Factura');
const sifen = require('./sifen');
const { errorHttp } = require('./cobros');

// En Paraguay los precios incluyen IVA: IVA 10% = total / 11, IVA 5% = total / 21
const calcularTotales = (items) => {
  const t = { exenta: 0, gravada5: 0, gravada10: 0, iva5: 0, iva10: 0, total: 0 };
  items.forEach((i) => {
    if (i.iva === 10) t.gravada10 += i.total;
    else if (i.iva === 5) t.gravada5 += i.total;
    else t.exenta += i.total;
    t.total += i.total;
  });
  t.iva10 = Math.round(t.gravada10 / 11);
  t.iva5 = Math.round(t.gravada5 / 21);
  return t;
};

const receptorDe = (cliente) => {
  if (cliente.tipoDocumento === 'ruc') {
    return { nombre: cliente.nombre, tipoDocumento: 'ruc', documento: `${cliente.documento}-${cliente.dv}` };
  }
  if (cliente.tipoDocumento === 'ci') {
    return { nombre: cliente.nombre, tipoDocumento: 'ci', documento: cliente.documento };
  }
  return { nombre: 'Sin Nombre', tipoDocumento: 'innominado', documento: '0' };
};

const timbradoVigente = (empresa, fecha) =>
  empresa?.timbrado?.numero &&
  empresa.timbrado.fechaInicio &&
  empresa.timbrado.fechaFin &&
  fecha >= empresa.timbrado.fechaInicio &&
  fecha <= new Date(new Date(empresa.timbrado.fechaFin).getTime() + 24 * 60 * 60 * 1000 - 1);

const enviarASifen = async (factura, empresa) => {
  try {
    const r = await sifen.enviar(factura, empresa);
    factura.sifen = { ...r, enviadoEn: new Date() };
  } catch (error) {
    factura.sifen = { estado: 'pendiente', mensaje: error.message, enviadoEn: new Date() };
  }
  await factura.save();
  return factura;
};

// Emite una factura por uno o mas pedidos entregados del mismo cliente.
// Las garantias de envases no se facturan (son depositos reembolsables, no ventas).
const emitirFactura = async ({ pedidoIds, usuario }) => {
  if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) throw errorHttp(400, 'Indique los pedidos a facturar');

  const empresa = await Empresa.findOne();
  const ahora = new Date();
  if (!empresa) throw errorHttp(400, 'Configure los datos de la empresa antes de facturar');
  if (!timbradoVigente(empresa, ahora)) throw errorHttp(400, 'El timbrado no esta vigente o no esta configurado');

  const pedidos = await Order.find({ _id: { $in: pedidoIds } });
  if (pedidos.length !== pedidoIds.length) throw errorHttp(404, 'Algun pedido no existe');
  const clienteId = pedidos[0].cliente.toString();
  if (pedidos.some((p) => p.cliente.toString() !== clienteId)) {
    throw errorHttp(400, 'Todos los pedidos deben ser del mismo cliente');
  }
  if (pedidos.some((p) => p.estado !== 'entregado')) throw errorHttp(400, 'Solo se facturan pedidos entregados');
  if (pedidos.some((p) => p.factura)) throw errorHttp(400, 'Algun pedido ya esta facturado');

  const cliente = await Client.findById(clienteId);
  const items = pedidos.flatMap((p) =>
    p.items.map((i) => ({
      descripcion: i.nombreProducto,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      iva: i.iva ?? 10,
      total: i.subtotal,
    }))
  );

  // Reservar los pedidos de forma atomica para que no se facturen dos veces
  const facturaId = new mongoose.Types.ObjectId();
  const reserva = await Order.updateMany(
    { _id: { $in: pedidoIds }, factura: null, estado: 'entregado' },
    { $set: { factura: facturaId } }
  );
  if (reserva.modifiedCount !== pedidoIds.length) {
    await Order.updateMany({ factura: facturaId }, { $set: { factura: null } });
    throw errorHttp(409, 'Algun pedido fue facturado por otro usuario');
  }

  try {
    const numerada = await Empresa.findOneAndUpdate({ _id: empresa._id }, { $inc: { siguienteNumero: 1 } });
    const numero = `${empresa.establecimiento}-${empresa.puntoExpedicion}-${String(numerada.siguienteNumero).padStart(7, '0')}`;
    const pagado = pedidos.every((p) => p.montoPagado >= p.total);

    const factura = await Factura.create({
      _id: facturaId,
      numero,
      timbrado: empresa.timbrado.numero,
      fecha: ahora,
      cliente: cliente._id,
      receptor: { ...receptorDe(cliente), direccion: cliente.direccion, email: cliente.email },
      condicion: pagado ? 'contado' : pedidos.some((p) => p.condicion === 'credito') ? 'credito' : 'contado',
      items,
      totales: calcularTotales(items),
      pedidos: pedidos.map((p) => p._id),
      usuario,
    });
    return enviarASifen(factura, empresa);
  } catch (error) {
    await Order.updateMany({ factura: facturaId }, { $set: { factura: null } });
    throw error;
  }
};

const anularFactura = async ({ id, motivo }) => {
  if (!motivo) throw errorHttp(400, 'Indique el motivo de la anulacion');
  const factura = await Factura.findById(id);
  if (!factura) throw errorHttp(404, 'Factura no encontrada');
  if (factura.estado === 'anulada') throw errorHttp(400, 'La factura ya esta anulada');

  await sifen.cancelar(factura, motivo);
  factura.estado = 'anulada';
  factura.motivoAnulacion = motivo;
  await factura.save();
  await Order.updateMany({ factura: factura._id }, { $set: { factura: null } });
  return factura;
};

module.exports = { emitirFactura, anularFactura, enviarASifen, calcularTotales };
