const Order = require('../models/Order');
const Cobro = require('../models/Cobro');
const Contador = require('../models/Contador');

const errorHttp = (statusCode, mensaje) => Object.assign(new Error(mensaje), { statusCode });

// Suma `monto` a lo pagado del pedido solo si no supera el total (atomico)
const aplicarAPedido = (pedidoId, monto) =>
  Order.findOneAndUpdate(
    { _id: pedidoId, estado: { $ne: 'cancelado' }, $expr: { $lte: [{ $add: ['$montoPagado', monto] }, '$total'] } },
    { $inc: { montoPagado: monto } },
    { new: true }
  );

const revertirAplicaciones = async (aplicaciones) => {
  for (const a of aplicaciones) {
    await Order.findByIdAndUpdate(a.pedido, { $inc: { montoPagado: -a.monto } });
  }
};

// Registra un cobro y lo distribuye entre los pedidos indicados, o si no se indican,
// entre los pedidos entregados con saldo del cliente (del mas antiguo al mas nuevo)
const registrarCobro = async ({ cliente, monto, metodo, referencia, pedidos, usuario }) => {
  monto = Number(monto);
  if (!Number.isInteger(monto) || monto <= 0) throw errorHttp(400, 'El monto debe ser un entero positivo en guaranies');

  const filtro = { cliente, estado: { $ne: 'cancelado' }, $expr: { $gt: ['$total', '$montoPagado'] } };
  if (pedidos && pedidos.length > 0) filtro._id = { $in: pedidos };
  else filtro.estado = 'entregado';

  const candidatos = await Order.find(filtro).sort({ entregadoEn: 1, createdAt: 1 });
  const deuda = candidatos.reduce((acc, o) => acc + (o.total - o.montoPagado), 0);
  if (candidatos.length === 0) throw errorHttp(400, 'El cliente no tiene pedidos con saldo pendiente');
  if (monto > deuda) throw errorHttp(400, `El monto supera el saldo pendiente (Gs. ${deuda.toLocaleString('es-PY')})`);

  const aplicaciones = [];
  let restante = monto;
  for (const pedido of candidatos) {
    if (restante === 0) break;
    const parte = Math.min(restante, pedido.total - pedido.montoPagado);
    const ok = await aplicarAPedido(pedido._id, parte);
    if (!ok) {
      await revertirAplicaciones(aplicaciones);
      throw errorHttp(409, 'Los saldos cambiaron mientras se registraba el cobro, intente de nuevo');
    }
    aplicaciones.push({ pedido: pedido._id, monto: parte });
    restante -= parte;
  }

  try {
    return await Cobro.create({
      numero: await Contador.siguiente('recibo'),
      cliente,
      monto,
      metodo,
      referencia,
      aplicaciones,
      usuario,
    });
  } catch (error) {
    await revertirAplicaciones(aplicaciones);
    throw error;
  }
};

const anularCobro = async ({ id, usuario, motivo }) => {
  if (!motivo) throw errorHttp(400, 'Indique el motivo de la anulacion');
  // Solo se anulan cobros que aun no fueron rendidos en un cierre de caja
  const cobro = await Cobro.findOneAndUpdate(
    { _id: id, anulado: false, cierre: null },
    { $set: { anulado: true, anuladoPor: usuario, motivoAnulacion: motivo } },
    { new: true }
  );
  if (!cobro) {
    const existe = await Cobro.findById(id);
    if (!existe) throw errorHttp(404, 'Cobro no encontrado');
    if (existe.anulado) throw errorHttp(400, 'El cobro ya esta anulado');
    throw errorHttp(400, 'El cobro ya fue rendido en un cierre de caja y no puede anularse');
  }
  await revertirAplicaciones(cobro.aplicaciones);
  return cobro;
};

module.exports = { registrarCobro, anularCobro, errorHttp };
