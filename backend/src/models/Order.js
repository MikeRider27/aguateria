const mongoose = require('mongoose');
const { enteroGs } = require('../utils/validadores');

const orderItemSchema = new mongoose.Schema(
  {
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    nombreProducto: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0, validate: enteroGs },
    subtotal: { type: Number, required: true, min: 0, validate: enteroGs },
    retornable: { type: Boolean, default: false },
    // Envases nuevos que el cliente paga como garantia (deposito)
    garantias: { type: Number, min: 0, default: 0 },
    montoGarantia: { type: Number, min: 0, default: 0, validate: enteroGs },
  },
  { _id: false }
);

const envaseRetiradoSchema = new mongoose.Schema(
  {
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    nombreProducto: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    subtotalProductos: { type: Number, min: 0, default: 0, validate: enteroGs },
    totalGarantias: { type: Number, min: 0, default: 0, validate: enteroGs },
    total: { type: Number, required: true, min: 0, validate: enteroGs },
    metodoPago: {
      type: String,
      enum: ['efectivo', 'transferencia', 'tarjeta', 'qr'],
      default: 'efectivo',
    },
    estado: {
      type: String,
      enum: ['pendiente', 'en_camino', 'entregado', 'cancelado'],
      default: 'pendiente',
    },
    repartidor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    zona: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
    fechaProgramada: { type: Date, default: Date.now },
    direccionEntrega: { type: String, required: true },
    notas: { type: String, trim: true },
    envasesRetirados: { type: [envaseRetiradoSchema], default: [] },
    entregadoEn: { type: Date },
    entregadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

orderSchema.index({ fechaProgramada: 1, repartidor: 1 });

module.exports = mongoose.model('Order', orderSchema);
