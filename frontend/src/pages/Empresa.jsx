import { useEffect, useState } from 'react';
import api from '../api/axios';
import { calcularDV, mensajeError } from '../utils/format';

const isoFecha = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

const vacio = {
  razonSocial: '',
  nombreFantasia: '',
  ruc: '',
  direccion: '',
  ciudad: '',
  telefono: '',
  email: '',
  actividadEconomica: '',
  timbradoNumero: '',
  timbradoInicio: '',
  timbradoFin: '',
  establecimiento: '001',
  puntoExpedicion: '001',
  siguienteNumero: 1,
};

const Empresa = () => {
  const [form, setForm] = useState(vacio);
  const [modoSifen, setModoSifen] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/empresa').then(({ data }) => {
      setModoSifen(data.modoSifen);
      const e = data.empresa;
      if (!e) return;
      setForm({
        ...vacio,
        ...Object.fromEntries(Object.keys(vacio).map((k) => [k, e[k] ?? vacio[k]])),
        timbradoNumero: e.timbrado?.numero || '',
        timbradoInicio: isoFecha(e.timbrado?.fechaInicio),
        timbradoFin: isoFecha(e.timbrado?.fechaFin),
      });
    });
  }, []);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    const { timbradoNumero, timbradoInicio, timbradoFin, ...resto } = form;
    try {
      await api.put('/empresa', {
        ...resto,
        siguienteNumero: Number(form.siguienteNumero),
        timbrado: {
          numero: timbradoNumero,
          fechaInicio: timbradoInicio ? `${timbradoInicio}T00:00:00` : null,
          fechaFin: timbradoFin ? `${timbradoFin}T00:00:00` : null,
        },
      });
      setMensaje('Datos guardados');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar'));
    }
  };

  return (
    <div className="pagina-angosta">
      <h1>Datos de la empresa</h1>
      <div className="alert-info">
        SIFEN: modo <strong>{modoSifen}</strong>.{' '}
        {modoSifen === 'simulado'
          ? 'Las facturas se numeran y se genera un CDC de prueba, pero no se envian a la DNIT. Para emitir con validez fiscal configure SIFEN_MODO=proveedor, SIFEN_API_URL y SIFEN_API_KEY de su proveedor de facturacion electronica.'
          : 'Las facturas se envian al proveedor de facturacion electronica configurado.'}
      </div>
      <form className="form card" onSubmit={guardar}>
        {error && <div className="alert-error">{error}</div>}
        {mensaje && <div className="alert-info">{mensaje}</div>}
        <div className="form-grid">
          <div className="span-2">
            <label>Razon social</label>
            <input value={form.razonSocial} onChange={set('razonSocial')} required />
          </div>
          <div>
            <label>Nombre de fantasia</label>
            <input value={form.nombreFantasia} onChange={set('nombreFantasia')} />
          </div>
          <div>
            <label>
              RUC (sin DV)
              {/^\d+$/.test(form.ruc) && <span className="dv-preview"> → {form.ruc}-{calcularDV(form.ruc)}</span>}
            </label>
            <input value={form.ruc} onChange={set('ruc')} inputMode="numeric" required />
          </div>
          <div className="span-2">
            <label>Actividad economica</label>
            <input value={form.actividadEconomica} onChange={set('actividadEconomica')} />
          </div>
          <div>
            <label>Direccion</label>
            <input value={form.direccion} onChange={set('direccion')} />
          </div>
          <div>
            <label>Ciudad</label>
            <input value={form.ciudad} onChange={set('ciudad')} />
          </div>
          <div>
            <label>Telefono</label>
            <input value={form.telefono} onChange={set('telefono')} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} />
          </div>
        </div>
        <h3>Timbrado y numeracion</h3>
        <div className="form-grid">
          <div>
            <label>Numero de timbrado</label>
            <input value={form.timbradoNumero} onChange={set('timbradoNumero')} required />
          </div>
          <div></div>
          <div>
            <label>Inicio de vigencia</label>
            <input type="date" value={form.timbradoInicio} onChange={set('timbradoInicio')} required />
          </div>
          <div>
            <label>Fin de vigencia</label>
            <input type="date" value={form.timbradoFin} onChange={set('timbradoFin')} required />
          </div>
          <div>
            <label>Establecimiento</label>
            <input value={form.establecimiento} onChange={set('establecimiento')} maxLength={3} required />
          </div>
          <div>
            <label>Punto de expedicion</label>
            <input value={form.puntoExpedicion} onChange={set('puntoExpedicion')} maxLength={3} required />
          </div>
          <div>
            <label>Proximo numero de factura</label>
            <input type="number" min="1" value={form.siguienteNumero} onChange={set('siguienteNumero')} required />
          </div>
        </div>
        <button type="submit">Guardar</button>
      </form>
    </div>
  );
};

export default Empresa;
