import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { fecha, fechaHora, gs, mensajeError } from '../utils/format';

const TIPOS = { frio_calor: 'Dispensador frio/calor', natural: 'Dispensador natural', bomba_electrica: 'Bomba electrica' };
const ESTADOS = { disponible: 'Disponible', comodato: 'En comodato', mantenimiento: 'En mantenimiento', baja: 'Baja' };
const CLASE_ESTADO = { disponible: 'tag tag-verde', comodato: 'tag tag-azul', mantenimiento: 'tag', baja: 'tag tag-rojo' };

const vacio = { codigo: '', tipo: 'frio_calor', marca: '', modelo: '', numeroSerie: '', frecuenciaMantenimientoDias: 90, notas: '' };

const Equipos = () => {
  const { tieneRol, esAdmin } = useAuth();
  const gestiona = tieneRol('admin', 'vendedor');
  const [equipos, setEquipos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(null);
  const [asignando, setAsignando] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [error, setError] = useState('');

  const cargar = async (f = filtro) => {
    const params = f === 'vencido' ? { mantenimientoVencido: true } : f ? { estado: f } : {};
    const { data } = await api.get('/equipos', { params });
    setEquipos(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const accion = async (fn, mensajeFallo) => {
    try {
      await fn();
      cargar();
    } catch (err) {
      window.alert(mensajeError(err, mensajeFallo));
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, frecuenciaMantenimientoDias: Number(form.frecuenciaMantenimientoDias) };
      if (form._id) await api.put(`/equipos/${form._id}`, payload);
      else await api.post('/equipos', payload);
      setForm(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el equipo'));
    }
  };

  const abrirAsignar = async (equipo) => {
    if (clientes.length === 0) {
      const { data } = await api.get('/clients', { params: { activo: true } });
      setClientes(data);
    }
    setError('');
    setAsignando({ equipo, cliente: '', numero: '', consumoMinimoMensual: 4, montoGarantia: 0, observacion: '' });
  };

  const asignar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/equipos/${asignando.equipo._id}/asignar`, {
        cliente: asignando.cliente,
        observacion: asignando.observacion,
        contrato: {
          numero: asignando.numero,
          consumoMinimoMensual: Number(asignando.consumoMinimoMensual),
          montoGarantia: Number(asignando.montoGarantia),
        },
      });
      setAsignando(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo asignar el equipo'));
    }
  };

  const verHistorial = async (id) => {
    const { data } = await api.get(`/equipos/${id}`);
    setHistorial(data);
  };

  const vencido = (e) => e.proximoMantenimiento && new Date(e.proximoMantenimiento) <= new Date();

  return (
    <div>
      <div className="page-header">
        <h1>Dispensadores y equipos</h1>
        {gestiona && <button onClick={() => { setError(''); setForm(vacio); }}>+ Nuevo equipo</button>}
      </div>

      <div className="filter-bar">
        {[['', 'Todos'], ...Object.entries(ESTADOS), ['vencido', 'Sanitizacion vencida']].map(([v, t]) => (
          <button
            key={v}
            className={filtro === v ? 'chip active' : 'chip'}
            onClick={() => {
              setFiltro(v);
              cargar(v);
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Equipo</th>
              <th>Estado</th>
              <th>Cliente / contrato</th>
              <th>Proxima sanitizacion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equipos.map((e) => (
              <tr key={e._id} className={vencido(e) ? 'row-warning' : e.estado === 'baja' ? 'row-inactivo' : ''}>
                <td>
                  <strong>{e.codigo}</strong>
                </td>
                <td>
                  {TIPOS[e.tipo]}
                  <small className="muted block">
                    {[e.marca, e.modelo, e.numeroSerie && `S/N ${e.numeroSerie}`].filter(Boolean).join(' · ')}
                  </small>
                </td>
                <td>
                  <span className={CLASE_ESTADO[e.estado]}>{ESTADOS[e.estado]}</span>
                </td>
                <td>
                  {e.cliente ? (
                    <>
                      {e.cliente.nombre}
                      <small className="muted block">
                        {e.contrato?.numero && `Contrato ${e.contrato.numero} · `}desde {fecha(e.contrato?.fechaInicio)}
                        {e.contrato?.consumoMinimoMensual > 0 && ` · min. ${e.contrato.consumoMinimoMensual} bidones/mes`}
                      </small>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {e.proximoMantenimiento ? (
                    <span className={vencido(e) ? 'txt-rojo' : ''}>{fecha(e.proximoMantenimiento)}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="acciones">
                  {gestiona && e.estado === 'disponible' && <button onClick={() => abrirAsignar(e)}>Entregar</button>}
                  {e.estado === 'comodato' && (
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        accion(() => api.post(`/equipos/${e._id}/mantenimiento`, { tipo: 'sanitizacion' }), 'No se pudo registrar')
                      }
                    >
                      Sanitizado
                    </button>
                  )}
                  {e.estado === 'mantenimiento' && (
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        accion(() => api.post(`/equipos/${e._id}/mantenimiento`, { tipo: 'sanitizacion' }), 'No se pudo registrar')
                      }
                    >
                      Listo para entregar
                    </button>
                  )}
                  {e.estado === 'comodato' && (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        const observacion = window.prompt(`¿Retirar ${e.codigo} de ${e.cliente?.nombre}? Motivo:`);
                        if (observacion !== null) accion(() => api.post(`/equipos/${e._id}/devolver`, { observacion }), 'No se pudo retirar');
                      }}
                    >
                      Retirar
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => verHistorial(e._id)}>
                    Historial
                  </button>
                  {gestiona && e.estado !== 'baja' && (
                    <button className="btn-secondary" onClick={() => { setError(''); setForm({ ...vacio, ...e }); }}>
                      Editar
                    </button>
                  )}
                  {esAdmin && ['disponible', 'mantenimiento'].includes(e.estado) && (
                    <button
                      className="btn-danger"
                      onClick={() => {
                        const observacion = window.prompt(`Motivo de baja de ${e.codigo}:`);
                        if (observacion) accion(() => api.post(`/equipos/${e._id}/baja`, { observacion }), 'No se pudo dar de baja');
                      }}
                    >
                      Baja
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo={form._id ? `Editar ${form.codigo}` : 'Nuevo equipo'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={guardar}>
            {error && <div className="alert-error">{error}</div>}
            <div className="form-grid">
              <div>
                <label>Codigo interno</label>
                <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="DISP-0004" required />
              </div>
              <div>
                <label>Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {Object.entries(TIPOS).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Marca</label>
                <input value={form.marca || ''} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
              </div>
              <div>
                <label>Modelo</label>
                <input value={form.modelo || ''} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
              </div>
              <div>
                <label>Nro. de serie</label>
                <input value={form.numeroSerie || ''} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} />
              </div>
              <div>
                <label>Sanitizar cada (dias)</label>
                <input
                  type="number"
                  min="0"
                  value={form.frecuenciaMantenimientoDias}
                  onChange={(e) => setForm({ ...form, frecuenciaMantenimientoDias: e.target.value })}
                />
              </div>
            </div>
            <label>Notas</label>
            <input value={form.notas || ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      )}

      {asignando && (
        <Modal titulo={`Entregar ${asignando.equipo.codigo} en comodato`} onClose={() => setAsignando(null)}>
          <form className="form" onSubmit={asignar}>
            {error && <div className="alert-error">{error}</div>}
            <label>Cliente</label>
            <select value={asignando.cliente} onChange={(e) => setAsignando({ ...asignando, cliente: e.target.value })} required>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <div className="form-grid">
              <div>
                <label>Nro. de contrato</label>
                <input value={asignando.numero} onChange={(e) => setAsignando({ ...asignando, numero: e.target.value })} />
              </div>
              <div>
                <label>Consumo minimo (bidones/mes)</label>
                <input
                  type="number"
                  min="0"
                  value={asignando.consumoMinimoMensual}
                  onChange={(e) => setAsignando({ ...asignando, consumoMinimoMensual: e.target.value })}
                />
              </div>
              <div>
                <label>Garantia del equipo (Gs.)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={asignando.montoGarantia}
                  onChange={(e) => setAsignando({ ...asignando, montoGarantia: e.target.value })}
                />
              </div>
            </div>
            <label>Observacion</label>
            <input value={asignando.observacion} onChange={(e) => setAsignando({ ...asignando, observacion: e.target.value })} />
            <button type="submit">Entregar en comodato</button>
          </form>
        </Modal>
      )}

      {historial && (
        <Modal titulo={`Historial de ${historial.codigo}`} onClose={() => setHistorial(null)} ancho>
          {historial.contrato?.montoGarantia > 0 && <p className="muted">Garantia del contrato: {gs(historial.contrato.montoGarantia)}</p>}
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Cliente</th>
                <th>Usuario</th>
                <th>Observacion</th>
              </tr>
            </thead>
            <tbody>
              {[...historial.historial].reverse().map((h, i) => (
                <tr key={i}>
                  <td>{fechaHora(h.fecha)}</td>
                  <td className="capitalize">{h.tipo}</td>
                  <td>{h.cliente?.nombre || ''}</td>
                  <td>{h.usuario?.nombre || ''}</td>
                  <td>{h.observacion || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
};

export default Equipos;
