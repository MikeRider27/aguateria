const Product = require('../models/Product');
const Client = require('../models/Client');
const EnvaseMovimiento = require('../models/EnvaseMovimiento');
const { saldosPorCliente, totalesEnClientes } = require('../services/envases');

// @desc Inventario de envases por producto retornable: llenos, vacios, danados y en clientes
const getResumen = async (req, res, next) => {
  try {
    const [productos, enClientes] = await Promise.all([
      Product.find({ retornable: true }).sort({ nombre: 1 }),
      totalesEnClientes(),
    ]);
    res.json(
      productos.map((p) => {
        const clientes = enClientes.get(p._id.toString()) || 0;
        return {
          _id: p._id,
          nombre: p.nombre,
          presentacion: p.presentacion,
          precioGarantia: p.precioGarantia,
          llenos: p.stock,
          vacios: p.stockVacios,
          danados: p.stockDanados,
          enClientes: clientes,
          total: p.stock + p.stockVacios + p.stockDanados + clientes,
        };
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc Clientes con envases en su poder (opcional: ?diasSinMovimiento=30)
const getClientesConEnvases = async (req, res, next) => {
  try {
    const saldos = await saldosPorCliente();
    const [clientes, productos] = await Promise.all([
      Client.find({ _id: { $in: saldos.map((s) => s.cliente) } })
        .select('nombre telefono whatsapp barrio ciudad zona')
        .populate('zona', 'nombre'),
      Product.find({ _id: { $in: saldos.map((s) => s.producto) } }).select('nombre presentacion'),
    ]);
    const clientesPorId = new Map(clientes.map((c) => [c._id.toString(), c]));
    const productosPorId = new Map(productos.map((p) => [p._id.toString(), p]));

    let filas = saldos.map((s) => ({
      cliente: clientesPorId.get(s.cliente.toString()),
      producto: productosPorId.get(s.producto.toString()),
      saldo: s.saldo,
      ultimoMovimiento: s.ultimoMovimiento,
    }));

    const dias = Number(req.query.diasSinMovimiento);
    if (dias > 0) {
      const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
      filas = filas.filter((f) => f.saldo > 0 && new Date(f.ultimoMovimiento).getTime() < limite);
    }

    filas.sort((a, b) => b.saldo - a.saldo);
    res.json(filas);
  } catch (error) {
    next(error);
  }
};

// @desc Ajuste manual del saldo de envases de un cliente (ej: conteo fisico, envase perdido)
const ajustarSaldo = async (req, res, next) => {
  try {
    const { cliente, producto, nota } = req.body;
    const cantidad = Number(req.body.cantidad);
    if (!Number.isInteger(cantidad) || cantidad === 0) {
      return res.status(400).json({ mensaje: 'La cantidad del ajuste debe ser un entero distinto de cero' });
    }
    if (!nota) return res.status(400).json({ mensaje: 'Indique el motivo del ajuste' });

    const [clienteDoc, productoDoc] = await Promise.all([Client.findById(cliente), Product.findById(producto)]);
    if (!clienteDoc) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    if (!productoDoc || !productoDoc.retornable) {
      return res.status(400).json({ mensaje: 'Producto retornable no encontrado' });
    }

    const movimiento = await EnvaseMovimiento.create({
      cliente,
      producto,
      tipo: 'ajuste',
      cantidad,
      usuario: req.user._id,
      nota,
    });
    res.status(201).json(movimiento);
  } catch (error) {
    next(error);
  }
};

module.exports = { getResumen, getClientesConEnvases, ajustarSaldo };
