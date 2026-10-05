const formatterGs = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 });

// Guaranies: sin decimales, separador de miles con punto -> "Gs. 15.000"
export const gs = (monto) => `Gs. ${formatterGs.format(Math.round(Number(monto) || 0))}`;

export const numero = (n) => formatterGs.format(Number(n) || 0);

export const fecha = (valor) => (valor ? new Date(valor).toLocaleDateString('es-PY') : '');

export const fechaHora = (valor) =>
  valor ? new Date(valor).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' }) : '';

// YYYY-MM-DD en hora local (para inputs type="date")
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export const CIUDADES = [
  'Asuncion',
  'Luque',
  'San Lorenzo',
  'Fernando de la Mora',
  'Lambare',
  'Mariano Roque Alonso',
  'Capiata',
  'Limpio',
  'Ñemby',
  'Villa Elisa',
  'San Antonio',
  'Itaugua',
  'Aregua',
];

export const METODOS_PAGO = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  qr: 'QR',
};

// Digito verificador del RUC (modulo 11), igual que en el backend
export const calcularDV = (numeroRuc) => {
  const normalizado = String(numeroRuc)
    .toUpperCase()
    .split('')
    .map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0))))
    .join('');
  let total = 0;
  let k = 2;
  for (let i = normalizado.length - 1; i >= 0; i--) {
    if (k > 11) k = 2;
    total += Number(normalizado[i]) * k;
    k++;
  }
  const resto = total % 11;
  return resto > 1 ? 11 - resto : 0;
};

export const enlaceWhatsApp = (numeroWa, texto = '') => {
  const limpio = String(numeroWa || '').replace(/\D/g, '');
  if (!limpio) return null;
  const internacional = limpio.startsWith('0') ? `595${limpio.slice(1)}` : limpio;
  return `https://wa.me/${internacional}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
};

export const enlaceMapa = (cliente) => {
  if (cliente?.ubicacion?.lat != null && cliente?.ubicacion?.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${cliente.ubicacion.lat},${cliente.ubicacion.lng}`;
  }
  const texto = [cliente?.direccion, cliente?.barrio, cliente?.ciudad, 'Paraguay'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
};

export const mensajeError = (err, porDefecto) => err.response?.data?.mensaje || porDefecto;
