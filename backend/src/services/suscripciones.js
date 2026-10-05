const Suscripcion = require('../models/Suscripcion');
const { crearPedido } = require('./pedidos');
const { DIAS_SEMANA } = require('../utils/fechas');

const DIA_MS = 24 * 60 * 60 * 1000;

const a8am = (fecha) => {
  const d = new Date(fecha);
  d.setHours(8, 0, 0, 0);
  return d;
};

// Primera fecha >= desde que cae en el dia indicado (semanal/quincenal) o en el dia del mes (mensual)
const primeraEntrega = ({ frecuencia, diaSemana, diaMes }, desde = new Date()) => {
  const d = a8am(desde);
  if (frecuencia === 'mensual') {
    const candidata = new Date(d.getFullYear(), d.getMonth(), diaMes, 8);
    return candidata >= a8am(desde) ? candidata : new Date(d.getFullYear(), d.getMonth() + 1, diaMes, 8);
  }
  const objetivo = DIAS_SEMANA.indexOf(diaSemana);
  const diff = (objetivo - d.getDay() + 7) % 7;
  return new Date(d.getTime() + diff * DIA_MS);
};

const siguienteEntrega = (fecha, { frecuencia, diaMes }) => {
  const d = new Date(fecha);
  if (frecuencia === 'semanal') return new Date(d.getTime() + 7 * DIA_MS);
  if (frecuencia === 'quincenal') return new Date(d.getTime() + 14 * DIA_MS);
  return new Date(d.getFullYear(), d.getMonth() + 1, diaMes, 8);
};

// Genera los pedidos de las suscripciones cuya proxima entrega cae hasta `diasAnticipacion`
// dias a partir de hoy. Es idempotente: cada suscripcion avanza su proximaEntrega de forma
// atomica antes de crear el pedido, y la revierte si el pedido no se pudo crear.
const generarPedidos = async ({ diasAnticipacion = Number(process.env.SUSCRIPCIONES_DIAS_ANTICIPACION ?? 1) } = {}) => {
  const limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() + diasAnticipacion + 1);

  const vencidas = await Suscripcion.find({ activa: true, proximaEntrega: { $lt: limite } });
  const resultado = { creados: 0, errores: [] };

  for (const s of vencidas) {
    let fecha = s.proximaEntrega;
    // Si quedo muy atrasada (ej: servidor apagado), no generar pedidos con fecha pasada
    const hoy = a8am(new Date());
    while (fecha < hoy) fecha = siguienteEntrega(fecha, s);
    if (fecha >= limite) {
      await Suscripcion.updateOne({ _id: s._id, proximaEntrega: s.proximaEntrega }, { $set: { proximaEntrega: fecha } });
      continue;
    }

    const siguiente = siguienteEntrega(fecha, s);
    const tomada = await Suscripcion.findOneAndUpdate(
      { _id: s._id, proximaEntrega: s.proximaEntrega, activa: true },
      { $set: { proximaEntrega: siguiente } }
    );
    if (!tomada) continue; // otro proceso ya la proceso

    try {
      const pedido = await crearPedido({
        cliente: s.cliente,
        items: s.items.map((i) => ({ producto: i.producto, cantidad: i.cantidad })),
        fechaProgramada: fecha,
        notas: s.notas ? `Suscripcion: ${s.notas}` : 'Pedido generado por suscripcion',
        suscripcion: s._id,
      });
      await Suscripcion.updateOne(
        { _id: s._id },
        { $set: { ultimoPedido: pedido._id, ultimoError: null }, $inc: { pedidosGenerados: 1 } }
      );
      resultado.creados++;
    } catch (error) {
      // Revertir para reintentar en la proxima corrida (ej: falta de stock)
      await Suscripcion.updateOne(
        { _id: s._id, proximaEntrega: siguiente },
        { $set: { proximaEntrega: fecha, ultimoError: error.message } }
      );
      resultado.errores.push({ suscripcion: s._id, mensaje: error.message });
    }
  }
  return resultado;
};

const iniciarProgramador = () => {
  const correr = () =>
    generarPedidos()
      .then((r) => r.creados + r.errores.length > 0 && console.log('Suscripciones:', JSON.stringify(r)))
      .catch((e) => console.error('Error generando pedidos de suscripciones:', e.message));
  correr();
  return setInterval(correr, 60 * 60 * 1000);
};

module.exports = { generarPedidos, iniciarProgramador, primeraEntrega, siguienteEntrega };
