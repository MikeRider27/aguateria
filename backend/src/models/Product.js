const mongoose = require('mongoose');
const { enteroGs } = require('../utils/validadores');

const productSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    presentacion: { type: String, required: true, trim: true }, // ej: "Bidon 20L", "Pack 12 x 500ml"
    precio: { type: Number, required: true, min: 0, validate: enteroGs },
    // stock = unidades listas para vender (en bidones retornables: envases llenos)
    stock: { type: Number, required: true, min: 0, default: 0 },
    stockMinimo: { type: Number, required: true, min: 0, default: 5 },
    // Envase retornable: el cliente devuelve el vacio y se controla el saldo por cliente
    retornable: { type: Boolean, default: false },
    precioGarantia: { type: Number, min: 0, default: 0, validate: enteroGs },
    stockVacios: { type: Number, min: 0, default: 0 },
    stockDanados: { type: Number, min: 0, default: 0 },
    // Tasa de IVA incluida en el precio (Paraguay: 10%, 5% o exenta)
    iva: { type: Number, enum: [10, 5, 0], default: 10 },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
