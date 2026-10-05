import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import EntregaModal from '../components/EntregaModal';
import { useAuth } from '../context/AuthContext';
import { fecha, gs, hoyISO, mensajeError, METODOS_PAGO } from '../utils/format';

const ESTADOS = ['pendiente', 'en_camino', 'entregado', 'cancelado'];

const nuevoItem = () => ({ producto: '', cantidad: 1, garantias: 0 });

const formVacio = () => ({
  cliente: '',
  direccionEntrega: '',
  metodoPago: 'efectivo',
  notas: '',
  repartidor: '',
  fechaProgramada: hoyISO(),
});

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [filtros, setFiltros] = useState({ estado: '', fecha: '' });
  const [mostrarModal, setMostrarModal] = useState(false);
  const [entregando, setEntregando] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(formVacio());
  const [items, setItems] = useState([nuevoItem()]);
  const { esAdmin } = useAuth();

  const cargarPedidos = async (f = filtros) => {
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    const { data } = await api.get('/orders', { params });
    setPedidos(data);
  };

  const cargarCatalogos = async () => {
    const [clientesRes, productosRes, repartidoresRes] = await Promise.all([
      api.get('/clients', { params: { activo: true } }),
      api.get('/products', { params: { activo: true } }),
      api.get('/users/repartidores'),
    ]);
    setClientes(clientesRes.data);
    setProductos(productosRes.data);
    setRepartidores(repartidoresRes.data);
  };

  useEffect(() => {
    cargarPedidos();
    cargarCatalogos();
  }, []);

  const cambiarFiltro = (campo, valor) => {
    const nuevos = { ...filtros, [campo]: valor };
    setFiltros(nuevos);
    cargarPedidos(nuevos);
  };

  const recargar = () => {
    cargarPedidos();
    cargarCatalogos();
  };

  const abrirNuevo = () => {
    setForm(formVacio());
    setItems([nuevoItem()]);
    setError('');
    setMostrarModal(true);
  };

  const actualizarItem = (index, campo, valor) => {
    const copia = [...items];
    copia[index] = { ...copia[index], [campo]: valor };
    setItems(copia);
  };

  const productoDe = (item) => productos.find((p) => p._id === item.producto);

  const totales = items.reduce(
    (acc, item) => {
      const p = productoDe(item);
      if (!p) return acc;
      acc.productos += p.precio * Number(item.cantidad || 0);
      if (p.retornable) acc.garantias += p.precioGarantia * Number(item.garantias || 0);
      return acc;
    },
    { productos: 0, garantias: 0 }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/orders', {
        ...form,
        repartidor: form.repartidor || null,
        items: items
          .filter((i) => i.producto)
          .map((i) => ({ producto: i.producto, cantidad: Number(i.cantidad), garantias: Number(i.garantias || 0) })),
      });
      setMostrarModal(false);
      recargar();
    } catch (err) {
      setError(mensajeError(err, 'Error al crear pedido'));
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/orders/${id}/estado`, { estado });
      recargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo cambiar el estado'));
    }
  };

  const asignarRepartidor = async (id, repartidor) => {
    try {
      await api.patch(`/orders/${id}/estado`, { repartidor });
      cargarPedidos();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo asignar el repartidor'));
    }
  };

  const eliminarPedido = async (id) => {
    if (!window.confirm('¿Eliminar este pedido? Se restaurara el stock si estaba activo.')) return;
    try {
      await api.delete(`/orders/${id}`);
      recargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo eliminar'));
    }
  };

  const activo = (p) => ['pendiente', 'en_camino'].includes(p.estado);

  return (
    <div>
      <div className="page-header">
        <h1>Pedidos</h1>
        <button onClick={abrirNuevo}>+ Nuevo pedido</button>
      </div>

      <div className="filter-bar">
        <button className={filtros.estado === '' ? 'chip active' : 'chip'} onClick={() => cambiarFiltro('estado', '')}>
          Todos
        </button>
        {ESTADOS.map((estado) => (
          <button
            key={estado}
            className={filtros.estado === estado ? 'chip active' : 'chip'}
            onClick={() => cambiarFiltro('estado', estado)}
          >
            {estado.replace('_', ' ')}
          </button>
        ))}
        <input
          type="date"
          className="input-inline"
          value={filtros.fecha}
          onChange={(e) => cambiarFiltro('fecha', e.target.value)}
          title="Fecha de entrega programada"
        />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Entrega</th>
              <th>Cliente</th>
              <th>Zona</th>
              <th>Detalle</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Repartidor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p._id}>
                <td>{fecha(p.fechaProgramada)}</td>
                <td>
                  {p.cliente?.nombre}
                  <small className="muted block">{p.direccionEntrega}</small>
                </td>
                <td>{p.zona?.nombre || '—'}</td>
                <td>
                  {p.items.map((i) => (
                    <div key={i.producto}>
                      {i.cantidad} × {i.nombreProducto}
                    </div>
                  ))}
                  {p.envasesRetirados?.length > 0 && (
                    <small className="muted block">
                      Retiro: {p.envasesRetirados.map((r) => `${r.cantidad} vacio(s)`).join(', ')}
                    </small>
                  )}
                </td>
                <td>
                  {gs(p.total)}
                  {p.totalGarantias > 0 && <small className="muted block">incl. garantia {gs(p.totalGarantias)}</small>}
                  <small className="muted block">{METODOS_PAGO[p.metodoPago]}</small>
                </td>
                <td>
                  <span className={`badge badge-${p.estado}`}>{p.estado.replace('_', ' ')}</span>
                </td>
                <td>
                  {activo(p) ? (
                    <select
                      className="select-inline"
                      value={p.repartidor?._id || ''}
                      onChange={(e) => asignarRepartidor(p._id, e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {repartidores.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    p.repartidor?.nombre || '—'
                  )}
                </td>
                <td className="acciones">
                  {p.estado === 'pendiente' && (
                    <button className="btn-secondary" onClick={() => cambiarEstado(p._id, 'en_camino')}>
                      En camino
                    </button>
                  )}
                  {activo(p) && (
                    <>
                      <button onClick={() => setEntregando(p)}>Entregar</button>
                      <button className="btn-secondary" onClick={() => cambiarEstado(p._id, 'cancelado')}>
                        Cancelar
                      </button>
                    </>
                  )}
                  {esAdmin && p.estado !== 'entregado' && (
                    <button className="btn-danger" onClick={() => eliminarPedido(p._id)}>
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entregando && (
        <EntregaModal
          pedido={entregando}
          onClose={() => setEntregando(null)}
          onEntregado={() => {
            setEntregando(null);
            recargar();
          }}
        />
      )}

      {mostrarModal && (
        <Modal titulo="Nuevo pedido" onClose={() => setMostrarModal(false)} ancho>
          <form onSubmit={handleSubmit} className="form">
            {error && <div className="alert-error">{error}</div>}
            <label>Cliente</label>
            <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} required>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre} - {c.telefono}
                  {c.zona ? ` (${c.zona.nombre})` : ''}
                </option>
              ))}
            </select>

            <div className="form-grid">
              <div>
                <label>Fecha de entrega</label>
                <input
                  type="date"
                  value={form.fechaProgramada}
                  onChange={(e) => setForm({ ...form, fechaProgramada: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Repartidor</label>
                <select value={form.repartidor} onChange={(e) => setForm({ ...form, repartidor: e.target.value })}>
                  <option value="">El de la zona del cliente</option>
                  {repartidores.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label>Direccion de entrega</label>
            <input
              value={form.direccionEntrega}
              onChange={(e) => setForm({ ...form, direccionEntrega: e.target.value })}
              placeholder="Se usa la direccion del cliente si se deja vacio"
            />

            <label>Productos</label>
            {items.map((item, index) => {
              const p = productoDe(item);
              return (
                <div key={index}>
                  <div className="item-row">
                    <select
                      value={item.producto}
                      onChange={(e) => actualizarItem(index, 'producto', e.target.value)}
                      required
                    >
                      <option value="">Selecciona un producto</option>
                      {productos.map((prod) => (
                        <option key={prod._id} value={prod._id}>
                          {prod.nombre} {prod.presentacion} - {gs(prod.precio)} - stock: {prod.stock}
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
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {p?.retornable && (
                    <div className="item-row item-sub">
                      <span className="item-label">
                        Envases nuevos con garantia ({gs(p.precioGarantia)} c/u)
                        <small>Solo si el cliente no entrega un vacio a cambio</small>
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={item.cantidad}
                        value={item.garantias}
                        onChange={(e) => actualizarItem(index, 'garantias', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" className="btn-secondary" onClick={() => setItems([...items, nuevoItem()])}>
              + Agregar producto
            </button>

            <label>Metodo de pago</label>
            <select value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}>
              {Object.entries(METODOS_PAGO).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>

            <label>Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />

            <div className="total-estimado">
              Total: {gs(totales.productos + totales.garantias)}
              {totales.garantias > 0 && (
                <small className="muted block">
                  Productos {gs(totales.productos)} + garantias {gs(totales.garantias)}
                </small>
              )}
            </div>

            <button type="submit">Crear pedido</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Pedidos;
