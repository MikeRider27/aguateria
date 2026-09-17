const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    direccion: { type: String, required: true, trim: true },
    referencia: { type: String, trim: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
