import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const vacio = { nombre: '', telefono: '', direccion: '', referencia: '' };

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState('');
  const { esAdmin } = useAuth();

  const cargar = async (q = '') => {
    const { data } = await api.get('/clients', { params: q ? { q } : {} });
    setClientes(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleBuscar = (e) => {
    e.preventDefault();
    cargar(busqueda);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setError('');
    setMostrarModal(true);
  };

  const abrirEditar = (cliente) => {
    setEditando(cliente);
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      referencia: cliente.referencia || '',
    });
    setError('');
    setMostrarModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editando) {
        await api.put(`/clients/${editando._id}`, form);
      } else {
        await api.post('/clients', form);
      }
      setMostrarModal(false);
      cargar(busqueda);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar cliente');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    await api.delete(`/clients/${id}`);
    cargar(busqueda);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <button onClick={abrirNuevo}>+ Nuevo cliente</button>
      </div>

      <form className="search-bar" onSubmit={handleBuscar}>
        <input
          placeholder="Buscar por nombre o telefono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Telefono</th>
            <th>Direccion</th>
            <th>Referencia</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c._id}>
              <td>{c.nombre}</td>
              <td>{c.telefono}</td>
              <td>{c.direccion}</td>
              <td>{c.referencia}</td>
              <td>
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

      {mostrarModal && (
        <Modal titulo={editando ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setMostrarModal(false)}>
          <form onSubmit={handleSubmit} className="form">
            {error && <div className="alert-error">{error}</div>}
            <label>Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <label>Telefono</label>
            <input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              required
            />
            <label>Direccion</label>
            <input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              required
            />
            <label>Referencia</label>
            <input
              value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })}
              placeholder="Ej: Casa azul, porton negro"
            />
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Clientes;
