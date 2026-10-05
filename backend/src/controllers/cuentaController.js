const Client = require('../models/Client');
const Order = require('../models/Order');
const Cobro = require('../models/Cobro');
const { deudasPorCliente } = require('../services/cuentas');

const DIA_MS = 24 * 60 * 60 * 1000;

// @desc Clientes con saldo pendiente, con indicacion de deuda vencida segun su plazo de credito
const getCuentas = async (req, res, next) => {
  try {
    const deudas = await deudasPorCliente();
    const clientes = await Client.find({ _id: { $in: deudas.map((d) => d._id) } })
      .select('nombre telefono whatsapp condicionVenta limiteCredito plazoDias zona')
      .populate('zona', 'nombre');
    const porId = new Map(clientes.map((c) => [c._id.toString(), c]));

    // Monto vencido por cliente: pedidos entregados hace mas de `plazoDias`
    const pedidosConSaldo = await Order.find({
      estado: 'entregado',
      cliente: { $in: deudas.map((d) => d._id) },
      $expr: { $gt: ['$total', '$montoPagado'] },
    }).select('cliente total montoPagado entregadoEn');
    const vencido = new Map();
    pedidosConSaldo.forEach((p) => {
      const c = porId.get(p.cliente.toString());
      const plazo = c?.condicionVenta === 'credito' ? c.plazoDias : 0;
      if (Date.now() - new Date(p.entregadoEn).getTime() > plazo * DIA_MS) {
        const id = p.cliente.toString();
        vencido.set(id, (vencido.get(id) || 0) + (p.total - p.montoPagado));
      }
    });

    const filas = deudas
      .map((d) => ({
        cliente: porId.get(d._id.toString()),
        saldo: d.saldo,
        pedidos: d.pedidos,
        vencido: vencido.get(d._id.toString()) || 0,
        masAntiguo: d.masAntiguo,
      }))
      .filter((f) => f.cliente)
      .sort((a, b) => b.vencido - a.vencido || b.saldo - a.saldo);

    res.json(filas);
  } catch (error) {
    next(error);
  }
};

// @desc Estado de cuenta: pedidos entregados (debe) y cobros (haber) con saldo acumulado
const getEstadoCuenta = async (req, res, next) => {
  try {
    const cliente = await Client.findById(req.params.id).populate('zona', 'nombre');
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    const [pedidos, cobros] = await Promise.all([
      Order.find({ cliente: cliente._id, estado: 'entregado' }).populate('factura', 'numero estado'),
      Cobro.find({ cliente: cliente._id, anulado: false }).populate('usuario', 'nombre'),
    ]);

    const movimientos = [
      ...pedidos.map((p) => ({
        fecha: p.entregadoEn,
        tipo: 'pedido',
        id: p._id,
        descripcion: p.items.map((i) => `${i.cantidad} × ${i.nombreProducto}`).join(', '),
        factura: p.factura?.estado === 'emitida' ? p.factura.numero : null,
        debe: p.total,
        haber: 0,
        saldoPedido: p.total - p.montoPagado,
      })),
      ...cobros.map((c) => ({
        fecha: c.createdAt,
        tipo: 'cobro',
        id: c._id,
        descripcion: `Recibo #${c.numero} · ${c.metodo}${c.referencia ? ` (${c.referencia})` : ''}`,
        debe: 0,
        haber: c.monto,
      })),
    ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let saldo = 0;
    movimientos.forEach((m) => {
      saldo += m.debe - m.haber;
      m.saldo = saldo;
    });

    res.json({
      cliente,
      saldo,
      creditoDisponible: cliente.condicionVenta === 'credito' && cliente.limiteCredito > 0 ? cliente.limiteCredito - saldo : null,
      movimientos: movimientos.reverse(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCuentas, getEstadoCuenta };
