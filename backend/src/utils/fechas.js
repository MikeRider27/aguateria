const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

// Rango [inicio, fin) del dia indicado (YYYY-MM-DD) en la zona horaria del servidor (TZ)
const rangoDia = (fechaStr) => {
  const inicio = fechaStr ? new Date(`${fechaStr}T00:00:00`) : new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
};

const diaSemana = (fecha) => DIAS_SEMANA[fecha.getDay()];

module.exports = { DIAS_SEMANA, rangoDia, diaSemana };
