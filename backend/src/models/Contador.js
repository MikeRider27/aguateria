const mongoose = require('mongoose');

// Numeradores secuenciales (recibos, etc.) incrementados de forma atomica
const contadorSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  valor: { type: Number, default: 0 },
});

contadorSchema.statics.siguiente = async function (nombre) {
  const c = await this.findOneAndUpdate({ _id: nombre }, { $inc: { valor: 1 } }, { new: true, upsert: true });
  return c.valor;
};

module.exports = mongoose.model('Contador', contadorSchema);
