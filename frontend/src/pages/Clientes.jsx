import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { CIUDADES, calcularDV, enlaceMapa, enlaceWhatsApp, fechaHora, gs, mensajeError } from '../utils/format';

const vacio = {
  tipo: 'particular',
  nombre: '',
  tipoDocumento: 'sin_documento',
  documento: '',
  telefono: '',
  whatsapp: '',
  email: '',
  direccion: '',
  barrio: '',
  ciudad: 'Asuncion',
  referencia: '',
  zona: '',
  lat: '',
  lng: '',
  activo: true,
};

const documentoTexto = (c) => {
  if (c.tipoDocumento === 'ruc') return `RUC ${c.rucCompleto}`;
  if (c.tipoDocumento === 'ci') return `CI ${c.documento}`;
  return '—';
};

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState('');
  const [detalleEnvases, setDetalleEnvases] = useState(null);
  const { esAdmin } = useAuth();

  const cargar = async (q = busqueda, zona = filtroZona) => {
    const params = {};
    if (q) params.q = q;
    if (zona) params.zona = zona;
    const { data } = await api.get('/clients', { params });
    setClientes(data);
  };

  useEffect(() => {
    cargar();
    api.get('/zones', { params: { activo: true } }).then(({ data }) => setZonas(data));
  }, []);

  const handleBuscar = (e) => {
    e.preventDefault();
    cargar();
  };

  const set = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setError('');
    setMostrarModal(true);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    setForm({
      ...vacio,
      ...Object.fromEntries(Object.keys(vacio).map((k) => [k, c[k] ?? vacio[k]])),
      zona: c.zona?._id || '',
      lat: c.ubicacion?.lat ?? '',
      lng: c.ubicacion?.lng ?? '',
    });
    setError('');
    setMostrarModal(true);
  };

  const verEnvases = async (c) => {
    const { data } = await api.get(`/clients/${c._id}/envases`);
    setDetalleEnvases({ cliente: c, ...data });
  };

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) return setError('El navegador no permite obtener la ubicacion');
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => setError('No se pudo obtener la ubicacion')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { lat, lng, ...resto } = form;
    const payload = {
      ...resto,
      documento: form.tipoDocumento === 'sin_documento' ? '' : form.documento.trim(),
      ubicacion: lat !== '' && lng !== '' ? { lat: Number(lat), lng: Number(lng) } : undefined,
    };
    try {
      if (editando) {
        await api.put(`/clients/${editando._id}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      setMostrarModal(false);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'Error al guardar cliente'));
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    try {
      await api.delete(`/clients/${id}`);
      cargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo eliminar'));
    }
  };

  const rucValido = /^\d+$/.test(form.documento);

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <button onClick={abrirNuevo}>+ Nuevo cliente</button>
      </div>

      <form className="search-bar" onSubmit={handleBuscar}>
        <input
          placeholder="Nombre, telefono, CI/RUC o barrio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          value={filtroZona}
          onChange={(e) => {
            setFiltroZona(e.target.value);
            cargar(busqueda, e.target.value);
          }}
        >
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z._id} value={z._id}>
              {z.nombre}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Contacto</th>
              <th>Direccion</th>
              <th>Zona</th>
              <th>Envases</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c._id} className={c.activo ? '' : 'row-inactivo'}>
                <td>
                  {c.nombre}
                  {c.tipo === 'empresa' && <span className="tag">Empresa</span>}
                  {!c.activo && <span className="tag">Inactivo</span>}
                </td>
                <td>{documentoTexto(c)}</td>
                <td>
                  {c.telefono}
                  {enlaceWhatsApp(c.whatsapp) && (
                    <a className="link-wa" href={enlaceWhatsApp(c.whatsapp)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  )}
                </td>
                <td>
                  <a href={enlaceMapa(c)} target="_blank" rel="noreferrer">
                    {c.direccion}
                  </a>
                  <small className="muted block">{[c.barrio, c.ciudad].filter(Boolean).join(', ')}</small>
                </td>
                <td>{c.zona?.nombre || '—'}</td>
                <td>
                  <button className="btn-link" onClick={() => verEnvases(c)}>
                    {c.envasesEnPoder}
                  </button>
                </td>
                <td className="acciones">
                  <button className="btn-secondary" onClick={() => abrirEditar(c)}>
                    Editar
                  </button>
                  {esAdmin && (
                    <button className="btn-danger" onClick={() => eliminar(c._id)}>
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarModal && (
        <Modal titulo={editando ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setMostrarModal(false)} ancho>
          <form onSubmit={handleSubmit} className="form">
            {error && <div className="alert-error">{error}</div>}
            <div className="form-grid">
              <div>
                <label>Tipo de cliente</label>
                <select value={form.tipo} onChange={set('tipo')}>
                  <option value="particular">Particular</option>
                  <option value="empresa">Empresa</option>
                </select>
              </div>
              <div>
                <label>{form.tipo === 'empresa' ? 'Razon social' : 'Nombre y apellido'}</label>
                <input value={form.nombre} onChange={set('nombre')} required />
              </div>
              <div>
                <label>Documento</label>
                <select value={form.tipoDocumento} onChange={set('tipoDocumento')}>
                  <option value="sin_documento">Sin documento</option>
                  <option value="ci">Cedula de identidad</option>
                  <option value="ruc">RUC</option>
                </select>
              </div>
              {form.tipoDocumento !== 'sin_documento' && (
                <div>
                  <label>
                    {form.tipoDocumento === 'ruc' ? 'RUC (sin DV)' : 'Nro. de cedula'}
                    {form.tipoDocumento === 'ruc' && rucValido && (
                      <span className="dv-preview"> → {form.documento}-{calcularDV(form.documento)}</span>
                    )}
                  </label>
                  <input value={form.documento} onChange={set('documento')} inputMode="numeric" required />
                </div>
              )}
              <div>
                <label>Telefono</label>
                <input value={form.telefono} onChange={set('telefono')} placeholder="0981 123 456" required />
              </div>
              <div>
                <label>WhatsApp</label>
                <input value={form.whatsapp} onChange={set('whatsapp')} placeholder="0981 123 456" />
              </div>
              <div className="span-2">
                <label>Email</label>
                <input type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="span-2">
                <label>Direccion</label>
                <input value={form.direccion} onChange={set('direccion')} placeholder="Calle y nro. c/ calle" required />
              </div>
              <div>
                <label>Barrio</label>
                <input value={form.barrio} onChange={set('barrio')} />
              </div>
              <div>
                <label>Ciudad</label>
                <input value={form.ciudad} onChange={set('ciudad')} list="ciudades" />
                <datalist id="ciudades">
                  {CIUDADES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label>Zona de reparto</label>
                <select value={form.zona} onChange={set('zona')}>
                  <option value="">Sin zona</option>
                  {zonas.map((z) => (
                    <option key={z._id} value={z._id}>
                      {z.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Referencia</label>
                <input value={form.referencia} onChange={set('referencia')} placeholder="Ej: casa azul, porton negro" />
              </div>
              <div>
                <label>Latitud</label>
                <input value={form.lat} onChange={set('lat')} inputMode="decimal" placeholder="-25.2865" />
              </div>
              <div>
                <label>Longitud</label>
                <input value={form.lng} onChange={set('lng')} inputMode="decimal" placeholder="-57.6470" />
              </div>
            </div>
            <button type="button" className="btn-secondary" onClick={usarUbicacionActual}>
              Usar mi ubicacion actual
            </button>
            {editando && (
              <label className="check">
                <input type="checkbox" checked={form.activo} onChange={set('activo')} /> Cliente activo
              </label>
            )}
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      )}

      {detalleEnvases && (
        <Modal titulo={`Envases de ${detalleEnvases.cliente.nombre}`} onClose={() => setDetalleEnvases(null)} ancho>
          {detalleEnvases.saldos.length === 0 ? (
            <p>El cliente no tiene envases en su poder.</p>
          ) : (
            <ul className="lista-simple">
              {detalleEnvases.saldos.map((s) => (
                <li key={s.producto?._id}>
                  <strong>{s.saldo}</strong> × {s.producto?.nombre} {s.producto?.presentacion}
                </li>
              ))}
            </ul>
          )}
          <p className="muted">Garantias pagadas: {gs(detalleEnvases.garantiasPagadas)}</p>
          <h4>Movimientos</h4>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Envase</th>
                <th>Cant.</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {detalleEnvases.movimientos.map((m) => (
                <tr key={m._id}>
                  <td>{fechaHora(m.createdAt)}</td>
                  <td>{m.tipo}</td>
                  <td>{m.producto?.presentacion}</td>
                  <td className={m.cantidad > 0 ? 'txt-verde' : 'txt-rojo'}>
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </td>
                  <td>{m.nota || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
};

export default Clientes;
