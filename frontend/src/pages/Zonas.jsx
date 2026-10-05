import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { CIUDADES, DIAS_SEMANA, mensajeError } from '../utils/format';

const vacio = { nombre: '', ciudad: 'Asuncion', diasVisita: [], repartidor: '', activo: true };

const Zonas = () => {
  const [zonas, setZonas] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    const { data } = await api.get('/zones');
    setZonas(data);
  };

  useEffect(() => {
    cargar();
    api.get('/users/repartidores').then(({ data }) => setRepartidores(data));
  }, []);

  const abrir = (zona = null) => {
    setEditando(zona);
    setForm(
      zona
        ? { nombre: zona.nombre, ciudad: zona.ciudad, diasVisita: zona.diasVisita, repartidor: zona.repartidor?._id || '', activo: zona.activo }
        : vacio
    );
    setError('');
  };

  const toggleDia = (dia) =>
    setForm({
      ...form,
      diasVisita: form.diasVisita.includes(dia) ? form.diasVisita.filter((d) => d !== dia) : [...form.diasVisita, dia],
    });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      repartidor: form.repartidor || null,
      diasVisita: DIAS_SEMANA.filter((d) => form.diasVisita.includes(d)),
    };
    try {
      if (editando) await api.put(`/zones/${editando._id}`, payload);
      else await api.post('/zones', payload);
      setForm(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'Error al guardar la zona'));
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta zona?')) return;
    try {
      await api.delete(`/zones/${id}`);
      cargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo eliminar'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Zonas de reparto</h1>
        <button onClick={() => abrir()}>+ Nueva zona</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Ciudad</th>
              <th>Dias de visita</th>
              <th>Repartidor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z._id} className={z.activo ? '' : 'row-inactivo'}>
                <td>
                  {z.nombre}
                  {!z.activo && <span className="tag">Inactiva</span>}
                </td>
                <td>{z.ciudad}</td>
                <td className="capitalize">{z.diasVisita.join(', ') || '—'}</td>
                <td>{z.repartidor?.nombre || 'Sin asignar'}</td>
                <td className="acciones">
                  <button className="btn-secondary" onClick={() => abrir(z)}>
                    Editar
                  </button>
                  <button className="btn-danger" onClick={() => eliminar(z._id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo={editando ? 'Editar zona' : 'Nueva zona'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={guardar}>
            {error && <div className="alert-error">{error}</div>}
            <label>Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <label>Ciudad</label>
            <input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} list="ciudades-z" required />
            <datalist id="ciudades-z">
              {CIUDADES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <label>Dias de visita</label>
            <div className="dias">
              {DIAS_SEMANA.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={form.diasVisita.includes(d) ? 'chip active' : 'chip'}
                  onClick={() => toggleDia(d)}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
            <label>Repartidor asignado</label>
            <select value={form.repartidor} onChange={(e) => setForm({ ...form, repartidor: e.target.value })}>
              <option value="">Sin asignar</option>
              {repartidores.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.nombre}
                </option>
              ))}
            </select>
            {editando && (
              <label className="check">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Zona activa
              </label>
            )}
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Zonas;
