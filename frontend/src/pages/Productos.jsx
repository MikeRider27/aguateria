import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';

const vacio = { nombre: '', presentacion: '', precio: '', stock: '', stockMinimo: '' };

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState('');

  const cargar = async () => {
    const { data } = await api.get('/products');
    setProductos(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setError('');
    setMostrarModal(true);
  };

  const abrirEditar = (producto) => {
    setEditando(producto);
    setForm({
      nombre: producto.nombre,
      presentacion: producto.presentacion,
      precio: producto.precio,
      stock: producto.stock,
      stockMinimo: producto.stockMinimo,
    });
    setError('');
    setMostrarModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      precio: Number(form.precio),
      stock: Number(form.stock),
      stockMinimo: Number(form.stockMinimo),
    };
    try {
      if (editando) {
        await api.put(`/products/${editando._id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setMostrarModal(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar producto');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    await api.delete(`/products/${id}`);
    cargar();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Productos</h1>
        <button onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Presentacion</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Stock minimo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p._id} className={p.stock <= p.stockMinimo ? 'row-warning' : ''}>
              <td>{p.nombre}</td>
              <td>{p.presentacion}</td>
              <td>${p.precio.toFixed(2)}</td>
              <td>{p.stock}</td>
              <td>{p.stockMinimo}</td>
              <td>
                <button className="btn-secondary" onClick={() => abrirEditar(p)}>
                  Editar
                </button>
                <button className="btn-danger" onClick={() => eliminar(p._id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mostrarModal && (
        <Modal titulo={editando ? 'Editar producto' : 'Nuevo producto'} onClose={() => setMostrarModal(false)}>
          <form onSubmit={handleSubmit} className="form">
            {error && <div className="alert-error">{error}</div>}
            <label>Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <label>Presentacion</label>
            <input
              value={form.presentacion}
              onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
              placeholder="Ej: Garrafon 20L"
              required
            />
            <label>Precio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              required
            />
            <label>Stock</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              required
            />
            <label>Stock minimo</label>
            <input
              type="number"
              min="0"
              value={form.stockMinimo}
              onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
              required
            />
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Productos;
