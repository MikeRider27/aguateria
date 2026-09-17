import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const ESTADOS = ['pendiente', 'en_camino', 'entregado', 'cancelado'];

const nuevoItem = () => ({ producto: '', cantidad: 1 });

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [error, setError] = useState('');

  const [cliente, setCliente] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([nuevoItem()]);
  const { esAdmin } = useAuth();

  const cargarPedidos = async (estado = '') => {
    const { data } = await api.get('/orders', { params: estado ? { estado } : {} });
    setPedidos(data);
  };

  const cargarCatalogos = async () => {
    const [clientesRes, productosRes] = await Promise.all([
      api.get('/clients'),
      api.get('/products', { params: { activo: true } }),
    ]);
    setClientes(clientesRes.data);
    setProductos(productosRes.data);
  };

  useEffect(() => {
    cargarPedidos();
    cargarCatalogos();
  }, []);

  const handleFiltro = (estado) => {
    setFiltroEstado(estado);
    cargarPedidos(estado);
  };

  const abrirNuevo = () => {
    setCliente('');
    setDireccionEntrega('');
    setMetodoPago('efectivo');
    setNotas('');
    setItems([nuevoItem()]);
    setError('');
    setMostrarModal(true);
  };

  const actualizarItem = (index, campo, valor) => {
    const copia = [...items];
    copia[index] = { ...copia[index], [campo]: valor };
    setItems(copia);
  };

  const agregarItem = () => setItems([...items, nuevoItem()]);
  const quitarItem = (index) => setItems(items.filter((_, i) => i !== index));

  const totalEstimado = items.reduce((acc, item) => {
    const producto = productos.find((p) => p._id === item.producto);
    if (!producto) return acc;
    return acc + producto.precio * Number(item.cantidad || 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const clienteSel = clientes.find((c) => c._id === cliente);
    try {
      await api.post('/orders', {
        cliente,
        items: items
          .filter((i) => i.producto)
          .map((i) => ({ producto: i.producto, cantidad: Number(i.cantidad) })),
        metodoPago,
        direccionEntrega: direccionEntrega || clienteSel?.direccion,
        notas,
      });
      setMostrarModal(false);
      cargarPedidos(filtroEstado);
      cargarCatalogos();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al crear pedido');
    }
  };

  const cambiarEstado = async (id, estado) => {
    await api.patch(`/orders/${id}/estado`, { estado });
    cargarPedidos(filtroEstado);
    cargarCatalogos();
  };

  const eliminarPedido = async (id) => {
    if (!window.confirm('¿Eliminar este pedido? Se restaurara el stock si estaba activo.')) return;
    await api.delete(`/orders/${id}`);
    cargarPedidos(filtroEstado);
    cargarCatalogos();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Pedidos</h1>
        <button onClick={abrirNuevo}>+ Nuevo pedido</button>
      </div>

      <div className="filter-bar">
        <button className={filtroEstado === '' ? 'chip active' : 'chip'} onClick={() => handleFiltro('')}>
          Todos
        </button>
        {ESTADOS.map((estado) => (
          <button
            key={estado}
            className={filtroEstado === estado ? 'chip active' : 'chip'}
            onClick={() => handleFiltro(estado)}
          >
            {estado.replace('_', ' ')}
          </button>
        ))}
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Direccion</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <tr key={p._id}>
              <td>{p.cliente?.nombre}</td>
              <td>{p.direccionEntrega}</td>
              <td>${p.total.toFixed(2)}</td>
              <td>
                <span className={`badge badge-${p.estado}`}>{p.estado.replace('_', ' ')}</span>
              </td>
              <td>{new Date(p.createdAt).toLocaleString()}</td>
              <td className="acciones-pedido">
                <select value={p.estado} onChange={(e) => cambiarEstado(p._id, e.target.value)}>
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {esAdmin && (
                  <button className="btn-danger" onClick={() => eliminarPedido(p._id)}>
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mostrarModal && (
        <Modal titulo="Nuevo pedido" onClose={() => setMostrarModal(false)}>
          <form onSubmit={handleSubmit} className="form">
            {error && <div className="alert-error">{error}</div>}
            <label>Cliente</label>
            <select value={cliente} onChange={(e) => setCliente(e.target.value)} required>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre} - {c.telefono}
                </option>
              ))}
            </select>

            <label>Direccion de entrega</label>
            <input
              value={direccionEntrega}
              onChange={(e) => setDireccionEntrega(e.target.value)}
              placeholder="Se usa la direccion del cliente si se deja vacio"
            />

            <label>Productos</label>
            {items.map((item, index) => (
              <div className="item-row" key={index}>
                <select
                  value={item.producto}
                  onChange={(e) => actualizarItem(index, 'producto', e.target.value)}
                  required
                >
                  <option value="">Selecciona un producto</option>
                  {productos.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nombre} ({p.presentacion}) - ${p.precio} - stock: {p.stock}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.cantidad}
                  onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                  required
                />
                {items.length > 1 && (
                  <button type="button" className="btn-danger" onClick={() => quitarItem(index)}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={agregarItem}>
              + Agregar producto
            </button>

            <label>Metodo de pago</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
            </select>

            <label>Notas</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />

            <div className="total-estimado">Total estimado: ${totalEstimado.toFixed(2)}</div>

            <button type="submit">Crear pedido</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Pedidos;
