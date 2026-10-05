const mongoose = require('mongoose');
const { DIAS_SEMANA } = require('../utils/fechas');

const itemSuscripcionSchema = new mongoose.Schema(
  {
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    cantidad: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// Entrega recurrente: genera pedidos automaticamente segun la frecuencia
const suscripcionSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    items: { type: [itemSuscripcionSchema], validate: (v) => v.length > 0 },
    frecuencia: { type: String, enum: ['semanal', 'quincenal', 'mensual'], required: true },
    diaSemana: { type: String, enum: DIAS_SEMANA }, // semanal / quincenal
    diaMes: { type: Number, min: 1, max: 28 }, // mensual
    proximaEntrega: { type: Date, required: true },
    activa: { type: Boolean, default: true },
    notas: { type: String, trim: true },
    pedidosGenerados: { type: Number, default: 0 },
    ultimoPedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    ultimoError: { type: String, default: null },
  },
  { timestamps: true }
);

suscripcionSchema.pre('validate', function (next) {
  if (this.frecuencia === 'mensual' && !this.diaMes) this.invalidate('diaMes', 'Indique el dia del mes (1 a 28)');
  if (this.frecuencia !== 'mensual' && !this.diaSemana) this.invalidate('diaSemana', 'Indique el dia de la semana');
  next();
});

suscripcionSchema.index({ activa: 1, proximaEntrega: 1 });

module.exports = mongoose.model('Suscripcion', suscripcionSchema);
