const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    nombreProducto: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    metodoPago: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta'], default: 'efectivo' },
    estado: {
      type: String,
      enum: ['pendiente', 'en_camino', 'entregado', 'cancelado'],
      default: 'pendiente',
    },
    repartidor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    direccionEntrega: { type: String, required: true },
    notas: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
