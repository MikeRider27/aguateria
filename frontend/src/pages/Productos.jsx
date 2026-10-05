import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { gs, mensajeError } from '../utils/format';

const vacio = {
  nombre: '',
  presentacion: '',
  precio: '',
  stock: '',
  stockMinimo: '',
  retornable: false,
  precioGarantia: '',
  stockVacios: '',
  iva: 10,
  activo: true,
};

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

  const set = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio);
    setError('');
    setMostrarModal(true);
  };

  const abrirEditar = (p) => {
    setEditando(p);
    setForm(Object.fromEntries(Object.keys(vacio).map((k) => [k, p[k] ?? vacio[k]])));
    setError('');
    setMostrarModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      precio: Number(form.precio),
      iva: Number(form.iva),
      stock: Number(form.stock),
      stockMinimo: Number(form.stockMinimo),
      precioGarantia: form.retornable ? Number(form.precioGarantia || 0) : 0,
      stockVacios: form.retornable ? Number(form.stockVacios || 0) : 0,
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
      setError(mensajeError(err, 'Error al guardar producto'));
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      cargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo eliminar'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Productos</h1>
        <button onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Minimo</th>
              <th>Envase</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr
                key={p._id}
                className={!p.activo ? 'row-inactivo' : p.stock <= p.stockMinimo ? 'row-warning' : ''}
              >
                <td>
                  {p.nombre} <span className="muted">{p.presentacion}</span>
                  {!p.activo && <span className="tag">Inactivo</span>}
                </td>
                <td>
                  {gs(p.precio)}
                  <small className="muted block">{p.iva ? `IVA ${p.iva}%` : 'Exenta'}</small>
                </td>
                <td>{p.stock}</td>
                <td>{p.stockMinimo}</td>
                <td>
                  {p.retornable ? (
                    <>
                      Retornable
                      <small className="muted block">Garantia {gs(p.precioGarantia)}</small>
                    </>
                  ) : (
                    'Descartable'
                  )}
                </td>
                <td className="acciones">
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
      </div>

      {mostrarModal && (
        <Modal titulo={editando ? 'Editar producto' : 'Nuevo producto'} onClose={() => setMostrarModal(false)}>
          <form onSubmit={handleSubmit} className="form">
            {error && <div className="alert-error">{error}</div>}
            <label>Nombre</label>
            <input value={form.nombre} onChange={set('nombre')} placeholder="Agua mineral" required />
            <label>Presentacion</label>
            <input value={form.presentacion} onChange={set('presentacion')} placeholder="Bidon 20L" required />
            <label>Precio (Gs.)</label>
            <div className="form-grid">
              <div>
                <input type="number" step="1" min="0" value={form.precio} onChange={set('precio')} required />
              </div>
              <div>
                <select value={form.iva} onChange={set('iva')}>
                  <option value={10}>IVA 10% incluido</option>
                  <option value={5}>IVA 5% incluido</option>
                  <option value={0}>Exenta</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div>
                <label>{form.retornable ? 'Stock (envases llenos)' : 'Stock'}</label>
                <input type="number" min="0" value={form.stock} onChange={set('stock')} required />
              </div>
              <div>
                <label>Stock minimo</label>
                <input type="number" min="0" value={form.stockMinimo} onChange={set('stockMinimo')} required />
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={form.retornable} onChange={set('retornable')} /> Envase retornable
              (el cliente devuelve el vacio)
            </label>
            {form.retornable && (
              <div className="form-grid">
                <div>
                  <label>Garantia por envase (Gs.)</label>
                  <input type="number" step="1" min="0" value={form.precioGarantia} onChange={set('precioGarantia')} />
                </div>
                <div>
                  <label>Envases vacios en planta</label>
                  <input type="number" min="0" value={form.stockVacios} onChange={set('stockVacios')} />
                </div>
              </div>
            )}
            {editando && (
              <label className="check">
                <input type="checkbox" checked={form.activo} onChange={set('activo')} /> Producto activo
              </label>
            )}
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Productos;
