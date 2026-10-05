const mongoose = require('mongoose');
const { enteroGs } = require('../utils/validadores');

const METODOS_COBRO = ['efectivo', 'transferencia', 'tarjeta', 'qr', 'cheque'];

const aplicacionSchema = new mongoose.Schema(
  {
    pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    monto: { type: Number, required: true, min: 1, validate: enteroGs },
  },
  { _id: false }
);

// Recibo de dinero: se aplica a uno o mas pedidos del cliente
const cobroSchema = new mongoose.Schema(
  {
    numero: { type: Number, required: true, unique: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    monto: { type: Number, required: true, min: 1, validate: enteroGs },
    metodo: { type: String, enum: METODOS_COBRO, required: true },
    referencia: { type: String, trim: true }, // nro. de transferencia, comprobante, cheque...
    aplicaciones: { type: [aplicacionSchema], default: [] },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // quien recibio el dinero
    cierre: { type: mongoose.Schema.Types.ObjectId, ref: 'CierreCaja', default: null },
    anulado: { type: Boolean, default: false },
    anuladoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    motivoAnulacion: { type: String, trim: true },
  },
  { timestamps: true }
);

cobroSchema.index({ usuario: 1, cierre: 1 });
cobroSchema.index({ cliente: 1 });

module.exports = mongoose.model('Cobro', cobroSchema);
module.exports.METODOS_COBRO = METODOS_COBRO;
