// Adaptador para SIFEN (facturacion electronica de la DNIT, e-Kuatia).
//
// SIFEN_MODO=simulado (por defecto): no envia nada; genera un CDC con la estructura
//   oficial de 44 digitos para poder probar el flujo completo. NO tiene validez fiscal.
// SIFEN_MODO=proveedor: envia el documento a un proveedor/integrador de facturacion
//   electronica (SIFEN_API_URL, SIFEN_API_KEY). El formato exacto del payload depende
//   del proveedor elegido: adaptar `construirPayload` a su API.
const { calcularDV } = require('../utils/ruc');

const modo = () => process.env.SIFEN_MODO || 'simulado';

const yyyymmdd = (fecha) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

// CDC: tipo doc (2) + RUC (8) + DV (1) + establecimiento (3) + punto (3) + numero (7)
// + tipo contribuyente (1) + fecha (8) + tipo emision (1) + codigo seguridad (9) + DV (1)
const generarCDC = (factura, empresa) => {
  const [est, pto, num] = factura.numero.split('-');
  const seguridad = String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  const base = [
    '01',
    empresa.ruc.padStart(8, '0'),
    String(empresa.dv),
    est,
    pto,
    num,
    '2',
    yyyymmdd(factura.fecha),
    '1',
    seguridad,
  ].join('');
  return base + calcularDV(base);
};

const construirPayload = (factura, empresa) => ({
  tipoDocumento: 1, // factura electronica
  timbrado: factura.timbrado,
  establecimiento: factura.numero.split('-')[0],
  puntoExpedicion: factura.numero.split('-')[1],
  numero: factura.numero.split('-')[2],
  fecha: factura.fecha,
  emisor: { ruc: `${empresa.ruc}-${empresa.dv}`, razonSocial: empresa.razonSocial, actividad: empresa.actividadEconomica },
  receptor: factura.receptor,
  condicion: factura.condicion,
  moneda: 'PYG',
  items: factura.items,
  totales: factura.totales,
});

const llamarProveedor = async (ruta, payload) => {
  const url = process.env.SIFEN_API_URL;
  if (!url) throw new Error('SIFEN_API_URL no configurado');
  const resp = await fetch(`${url.replace(/\/$/, '')}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SIFEN_API_KEY || ''}` },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.mensaje || data.message || `El proveedor respondio ${resp.status}`);
  return data;
};

const enviar = async (factura, empresa) => {
  if (modo() === 'simulado') {
    return {
      estado: 'simulado',
      cdc: generarCDC(factura, empresa),
      mensaje: 'Modo simulado: el documento no fue enviado a la DNIT',
    };
  }
  const r = await llamarProveedor('/documentos', construirPayload(factura, empresa));
  return { estado: r.estado === 'rechazado' ? 'rechazado' : 'aprobado', cdc: r.cdc, mensaje: r.mensaje };
};

// Evento de cancelacion (anulacion) del documento ante SIFEN
const cancelar = async (factura, motivo) => {
  if (modo() === 'simulado' || !factura.sifen?.cdc) return { ok: true };
  await llamarProveedor('/eventos/cancelacion', { cdc: factura.sifen.cdc, motivo });
  return { ok: true };
};

module.exports = { enviar, cancelar, generarCDC, modo };
