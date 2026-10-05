const mongoose = require('mongoose');

// Libro de movimientos de envases retornables en poder de clientes.
// El saldo de un cliente para un producto es la suma de `cantidad`:
// entrega (+), retiro (-), ajuste (+/-).
const envaseMovimientoSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    tipo: { type: String, enum: ['entrega', 'retiro', 'ajuste'], required: true },
    cantidad: { type: Number, required: true },
    pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nota: { type: String, trim: true },
  },
  { timestamps: true }
);

envaseMovimientoSchema.index({ cliente: 1, producto: 1 });

module.exports = mongoose.model('EnvaseMovimiento', envaseMovimientoSchema);
