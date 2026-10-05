const mongoose = require('mongoose');
const { enteroGs } = require('../utils/validadores');

const TIPOS_EQUIPO = ['frio_calor', 'natural', 'bomba_electrica'];

const eventoSchema = new mongoose.Schema(
  {
    fecha: { type: Date, default: Date.now },
    tipo: {
      type: String,
      enum: ['alta', 'entrega', 'devolucion', 'sanitizacion', 'reparacion', 'baja'],
      required: true,
    },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    observacion: { type: String, trim: true },
  },
  { _id: false }
);

// Dispensador u otro equipo propio que se presta al cliente en comodato
const equipoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    tipo: { type: String, enum: TIPOS_EQUIPO, required: true },
    marca: { type: String, trim: true },
    modelo: { type: String, trim: true },
    numeroSerie: { type: String, trim: true },
    estado: {
      type: String,
      enum: ['disponible', 'comodato', 'mantenimiento', 'baja'],
      default: 'disponible',
    },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    contrato: {
      numero: { type: String, trim: true },
      fechaInicio: { type: Date },
      // Bidones por mes que el cliente se compromete a consumir para mantener el comodato
      consumoMinimoMensual: { type: Number, min: 0, default: 0 },
      montoGarantia: { type: Number, min: 0, default: 0, validate: enteroGs },
    },
    frecuenciaMantenimientoDias: { type: Number, min: 0, default: 90 },
    ultimoMantenimiento: { type: Date, default: null },
    historial: { type: [eventoSchema], default: [] },
    notas: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Proxima sanitizacion: desde la ultima, o desde la entrega si nunca se hizo
equipoSchema.virtual('proximoMantenimiento').get(function () {
  if (this.estado !== 'comodato' || !this.frecuenciaMantenimientoDias) return null;
  const base = this.ultimoMantenimiento || this.contrato?.fechaInicio;
  if (!base) return null;
  return new Date(new Date(base).getTime() + this.frecuenciaMantenimientoDias * 24 * 60 * 60 * 1000);
});

equipoSchema.index({ cliente: 1 });

module.exports = mongoose.model('Equipo', equipoSchema);
module.exports.TIPOS_EQUIPO = TIPOS_EQUIPO;
