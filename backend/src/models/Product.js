const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    presentacion: { type: String, required: true, trim: true }, // ej: "Garrafon 20L", "Botella 600ml"
    precio: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    stockMinimo: { type: Number, required: true, min: 0, default: 5 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
