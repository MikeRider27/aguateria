import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { ROLES } from '../context/AuthContext';
import { mensajeError } from '../utils/format';

const vacio = { nombre: '', email: '', telefono: '', rol: 'repartidor', password: '', activo: true };

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    const { data } = await api.get('/users');
    setUsuarios(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrir = (u = null) => {
    setEditando(u);
    setForm(u ? { nombre: u.nombre, email: u.email, telefono: u.telefono || '', rol: u.rol, password: '', activo: u.activo } : vacio);
    setError('');
  };

  const set = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    try {
      if (editando) await api.put(`/users/${editando._id}`, payload);
      else await api.post('/users', payload);
      setForm(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'Error al guardar el usuario'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Usuarios</h1>
        <button onClick={() => abrir()}>+ Nuevo usuario</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u._id} className={u.activo ? '' : 'row-inactivo'}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td>{u.telefono}</td>
                <td>{ROLES[u.rol] || u.rol}</td>
                <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
                <td>
                  <button className="btn-secondary" onClick={() => abrir(u)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo={editando ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={guardar}>
            {error && <div className="alert-error">{error}</div>}
            <label>Nombre</label>
            <input value={form.nombre} onChange={set('nombre')} required />
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required />
            <label>Telefono</label>
            <input value={form.telefono} onChange={set('telefono')} />
            <label>Rol</label>
            <select value={form.rol} onChange={set('rol')}>
              {Object.entries(ROLES).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
            <label>{editando ? 'Nueva contraseña (dejar vacio para no cambiar)' : 'Contraseña'}</label>
            <input type="password" value={form.password} onChange={set('password')} minLength={6} required={!editando} />
            {editando && (
              <label className="check">
                <input type="checkbox" checked={form.activo} onChange={set('activo')} /> Usuario activo
              </label>
            )}
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Usuarios;
