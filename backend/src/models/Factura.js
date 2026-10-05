const mongoose = require('mongoose');
const { enteroGs } = require('../utils/validadores');

const itemFacturaSchema = new mongoose.Schema(
  {
    descripcion: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true, validate: enteroGs },
    iva: { type: Number, enum: [10, 5, 0], required: true },
    total: { type: Number, required: true, validate: enteroGs },
  },
  { _id: false }
);

const facturaSchema = new mongoose.Schema(
  {
    numero: { type: String, required: true, unique: true }, // 001-001-0000001
    timbrado: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    receptor: {
      nombre: { type: String, required: true },
      tipoDocumento: { type: String, enum: ['ruc', 'ci', 'innominado'], required: true },
      documento: { type: String },
      direccion: { type: String },
      email: { type: String },
    },
    condicion: { type: String, enum: ['contado', 'credito'], required: true },
    items: { type: [itemFacturaSchema], validate: (v) => v.length > 0 },
    totales: {
      exenta: { type: Number, default: 0 },
      gravada5: { type: Number, default: 0 },
      gravada10: { type: Number, default: 0 },
      iva5: { type: Number, default: 0 },
      iva10: { type: Number, default: 0 },
      total: { type: Number, required: true, validate: enteroGs },
    },
    pedidos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    estado: { type: String, enum: ['emitida', 'anulada'], default: 'emitida' },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    motivoAnulacion: { type: String, trim: true },
    sifen: {
      estado: { type: String, enum: ['pendiente', 'aprobado', 'rechazado', 'simulado'], default: 'pendiente' },
      cdc: { type: String },
      mensaje: { type: String },
      enviadoEn: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Factura', facturaSchema);
