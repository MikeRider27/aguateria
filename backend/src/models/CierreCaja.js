const mongoose = require('mongoose');
const { enteroGs } = require('../utils/validadores');

// Rendicion de caja: agrupa los cobros de un usuario (repartidor o cajero) y compara
// el efectivo declarado contra el registrado en el sistema
const cierreCajaSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recibidoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cobros: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cobro' }],
    totales: {
      efectivo: { type: Number, default: 0 },
      transferencia: { type: Number, default: 0 },
      tarjeta: { type: Number, default: 0 },
      qr: { type: Number, default: 0 },
      cheque: { type: Number, default: 0 },
    },
    total: { type: Number, required: true, validate: enteroGs },
    efectivoDeclarado: { type: Number, required: true, min: 0, validate: enteroGs },
    diferencia: { type: Number, required: true, validate: enteroGs },
    observacion: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CierreCaja', cierreCajaSchema);
