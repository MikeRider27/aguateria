const mongoose = require('mongoose');
const { calcularDV } = require('../utils/ruc');

const clientSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ['particular', 'empresa'], default: 'particular' },
    // Nombre y apellido, o razon social si es empresa
    nombre: { type: String, required: true, trim: true },
    tipoDocumento: { type: String, enum: ['ci', 'ruc', 'sin_documento'], default: 'sin_documento' },
    documento: { type: String, trim: true },
    dv: { type: Number, min: 0, max: 9 },
    telefono: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    direccion: { type: String, required: true, trim: true },
    barrio: { type: String, trim: true },
    ciudad: { type: String, trim: true },
    referencia: { type: String, trim: true },
    zona: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
    ubicacion: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

clientSchema.pre('validate', function (next) {
  if (this.tipoDocumento === 'ruc') {
    if (!this.documento || !/^\d+$/.test(this.documento)) {
      this.invalidate('documento', 'El RUC debe contener solo numeros (sin el digito verificador)');
    } else {
      this.dv = calcularDV(this.documento);
    }
  } else {
    this.dv = undefined;
  }
  if (this.tipoDocumento !== 'sin_documento' && !this.documento) {
    this.invalidate('documento', 'El numero de documento es requerido');
  }
  next();
});

clientSchema.virtual('rucCompleto').get(function () {
  return this.tipoDocumento === 'ruc' && this.documento ? `${this.documento}-${this.dv}` : null;
});

clientSchema.index({ tipoDocumento: 1, documento: 1 }, { unique: true, partialFilterExpression: { documento: { $type: 'string', $gt: '' } } });

module.exports = mongoose.model('Client', clientSchema);
