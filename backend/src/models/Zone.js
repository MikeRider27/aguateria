const mongoose = require('mongoose');
const { DIAS_SEMANA } = require('../utils/fechas');

const zoneSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true },
    ciudad: { type: String, required: true, trim: true },
    diasVisita: [{ type: String, enum: DIAS_SEMANA }],
    repartidor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Zone', zoneSchema);
