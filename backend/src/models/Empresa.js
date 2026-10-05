const mongoose = require('mongoose');
const { calcularDV } = require('../utils/ruc');

// Datos del emisor para facturacion (documento unico)
const empresaSchema = new mongoose.Schema(
  {
    razonSocial: { type: String, required: true, trim: true },
    nombreFantasia: { type: String, trim: true },
    ruc: { type: String, required: true, trim: true, match: [/^\d+$/, 'El RUC debe contener solo numeros'] },
    dv: { type: Number },
    direccion: { type: String, trim: true },
    ciudad: { type: String, trim: true },
    telefono: { type: String, trim: true },
    email: { type: String, trim: true },
    actividadEconomica: { type: String, trim: true },
    timbrado: {
      numero: { type: String, trim: true },
      fechaInicio: { type: Date },
      fechaFin: { type: Date },
    },
    establecimiento: { type: String, default: '001', match: [/^\d{3}$/, 'Establecimiento debe tener 3 digitos'] },
    puntoExpedicion: { type: String, default: '001', match: [/^\d{3}$/, 'Punto de expedicion debe tener 3 digitos'] },
    siguienteNumero: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

empresaSchema.pre('validate', function (next) {
  if (this.ruc) this.dv = calcularDV(this.ruc);
  next();
});

module.exports = mongoose.model('Empresa', empresaSchema);
