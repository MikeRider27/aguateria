import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { DIAS_SEMANA, fecha, gs, hoyISO, mensajeError } from '../utils/format';

const FRECUENCIAS = { semanal: 'Semanal', quincenal: 'Cada 15 dias', mensual: 'Mensual' };

const calendario = (s) =>
  s.frecuencia === 'mensual' ? `Mensual, dia ${s.diaMes}` : `${FRECUENCIAS[s.frecuencia]}, los ${s.diaSemana}`;

const Suscripciones = () => {
  const { esAdmin } = useAuth();
  const [suscripciones, setSuscripciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = async () => {
    const { data } = await api.get('/suscripciones');
    setSuscripciones(data);
  };

  useEffect(() => {
    cargar();
    Promise.all([api.get('/clients', { params: { activo: true } }), api.get('/products', { params: { activo: true } })]).then(
      ([c, p]) => {
        setClientes(c.data);
        setProductos(p.data);
      }
    );
  }, []);

  const abrir = (s = null) => {
    setError('');
    setForm(
      s
        ? {
            _id: s._id,
            cliente: s.cliente?._id,
            items: s.items.map((i) => ({ producto: i.producto?._id, cantidad: i.cantidad })),
            frecuencia: s.frecuencia,
            diaSemana: s.diaSemana || 'lunes',
            diaMes: s.diaMes || 1,
            notas: s.notas || '',
            activa: s.activa,
          }
        : { cliente: '', items: [{ producto: '', cantidad: 2 }], frecuencia: 'semanal', diaSemana: 'lunes', diaMes: 1, notas: '', desde: hoyISO(), activa: true }
    );
  };

  const setItem = (idx, campo, valor) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [campo]: valor };
    setForm({ ...form, items });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      diaMes: Number(form.diaMes),
      items: form.items.filter((i) => i.producto).map((i) => ({ producto: i.producto, cantidad: Number(i.cantidad) })),
    };
    try {
      if (form._id) await api.put(`/suscripciones/${form._id}`, payload);
      else await api.post('/suscripciones', payload);
      setForm(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la suscripcion'));
    }
  };

  const alternar = async (s) => {
    await api.put(`/suscripciones/${s._id}`, { activa: !s.activa });
    cargar();
  };

  const eliminar = async (s) => {
    if (!window.confirm(`¿Eliminar la suscripcion de ${s.cliente?.nombre}?`)) return;
    await api.delete(`/suscripciones/${s._id}`);
    cargar();
  };

  const generar = async () => {
    try {
      const { data } = await api.post('/suscripciones/generar');
      setAviso(
        `${data.creados} pedido(s) generado(s).` +
          (data.errores.length ? ` ${data.errores.length} con error: ${data.errores.map((e) => e.mensaje).join('; ')}` : '')
      );
      cargar();
    } catch (err) {
      setAviso(mensajeError(err, 'No se pudieron generar los pedidos'));
    }
  };

  const valorMensual = (s) =>
    s.items.reduce((a, i) => a + (i.producto?.precio || 0) * i.cantidad, 0) *
    (s.frecuencia === 'semanal' ? 4 : s.frecuencia === 'quincenal' ? 2 : 1);

  return (
    <div>
      <div className="page-header">
        <h1>Suscripciones</h1>
        <div>
          {esAdmin && (
            <button className="btn-secondary" onClick={generar}>
              Generar pedidos ahora
            </button>
          )}
          <button onClick={() => abrir()}>+ Nueva suscripcion</button>
        </div>
      </div>
      <p className="muted">
        Los pedidos se generan automaticamente cada hora, un dia antes de la fecha de entrega, y se asignan al repartidor
        de la zona del cliente.
      </p>
      {aviso && <div className="alert-info">{aviso}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Frecuencia</th>
              <th>Proxima entrega</th>
              <th className="num">Valor mensual aprox.</th>
              <th>Pedidos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {suscripciones.map((s) => (
              <tr key={s._id} className={s.activa ? (s.ultimoError ? 'row-warning' : '') : 'row-inactivo'}>
                <td>
                  {s.cliente?.nombre}
                  {!s.activa && <span className="tag">Pausada</span>}
                </td>
                <td>
                  {s.items.map((i, idx) => (
                    <div key={idx}>
                      {i.cantidad} × {i.producto?.nombre} {i.producto?.presentacion}
                    </div>
                  ))}
                </td>
                <td>{calendario(s)}</td>
                <td>
                  {s.activa ? fecha(s.proximaEntrega) : '—'}
                  {s.ultimoError && <small className="txt-rojo block">{s.ultimoError}</small>}
                </td>
                <td className="num">{gs(valorMensual(s))}</td>
                <td>{s.pedidosGenerados}</td>
                <td className="acciones">
                  <button className="btn-secondary" onClick={() => abrir(s)}>
                    Editar
                  </button>
                  <button className="btn-secondary" onClick={() => alternar(s)}>
                    {s.activa ? 'Pausar' : 'Reactivar'}
                  </button>
                  <button className="btn-danger" onClick={() => eliminar(s)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo={form._id ? 'Editar suscripcion' : 'Nueva suscripcion'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={guardar}>
            {error && <div className="alert-error">{error}</div>}
            <label>Cliente</label>
            <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} disabled={!!form._id} required>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <label>Productos</label>
            {form.items.map((item, idx) => (
              <div className="item-row" key={idx}>
                <select value={item.producto} onChange={(e) => setItem(idx, 'producto', e.target.value)} required>
                  <option value="">Producto</option>
                  {productos.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nombre} {p.presentacion}
                    </option>
                  ))}
                </select>
                <input type="number" min="1" value={item.cantidad} onChange={(e) => setItem(idx, 'cantidad', e.target.value)} required />
                {form.items.length > 1 && (
                  <button type="button" className="btn-danger" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setForm({ ...form, items: [...form.items, { producto: '', cantidad: 1 }] })}>
              + Agregar producto
            </button>
            <div className="form-grid">
              <div>
                <label>Frecuencia</label>
                <select value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}>
                  {Object.entries(FRECUENCIAS).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {form.frecuencia === 'mensual' ? (
                  <>
                    <label>Dia del mes</label>
                    <input type="number" min="1" max="28" value={form.diaMes} onChange={(e) => setForm({ ...form, diaMes: e.target.value })} />
                  </>
                ) : (
                  <>
                    <label>Dia de entrega</label>
                    <select value={form.diaSemana} onChange={(e) => setForm({ ...form, diaSemana: e.target.value })}>
                      {DIAS_SEMANA.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
              {!form._id && (
                <div>
                  <label>A partir de</label>
                  <input type="date" value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} />
                </div>
              )}
            </div>
            <label>Notas para el repartidor</label>
            <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Suscripciones;
