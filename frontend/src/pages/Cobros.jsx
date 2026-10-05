import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { fecha, fechaHora, gs, hoyISO, mensajeError, METODOS_COBRO } from '../utils/format';

const Cobros = () => {
  const { tieneRol } = useAuth();
  const puedeAnular = tieneRol('admin', 'cajero');
  const [cobros, setCobros] = useState([]);
  const [filtros, setFiltros] = useState({ desde: hoyISO(), hasta: hoyISO() });
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [error, setError] = useState('');

  const cargar = async (f = filtros) => {
    const { data } = await api.get('/cobros', { params: f });
    setCobros(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = async () => {
    const { data } = await api.get('/clients', { params: { activo: true } });
    setClientes(data);
    setForm({ cliente: '', monto: '', metodo: 'efectivo', referencia: '', pedidos: [] });
    setCuenta(null);
    setError('');
  };

  // Al elegir cliente se muestran sus pedidos con saldo para aplicar el cobro
  const elegirCliente = async (id) => {
    setForm({ ...form, cliente: id, pedidos: [], monto: '' });
    setCuenta(null);
    if (!id) return;
    const { data } = await api.get('/orders', { params: { cliente: id } });
    const conSaldo = data.filter((p) => p.estado !== 'cancelado' && p.total > p.montoPagado);
    setCuenta(conSaldo);
  };

  const togglePedido = (p) => {
    const pedidos = form.pedidos.includes(p._id) ? form.pedidos.filter((x) => x !== p._id) : [...form.pedidos, p._id];
    const sugerido = cuenta.filter((c) => pedidos.includes(c._id)).reduce((a, c) => a + c.total - c.montoPagado, 0);
    setForm({ ...form, pedidos, monto: sugerido || '' });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/cobros', { ...form, monto: Number(form.monto) });
      setForm(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el cobro'));
    }
  };

  const anular = async (c) => {
    const motivo = window.prompt(`Motivo de anulacion del recibo #${c.numero}:`);
    if (!motivo) return;
    try {
      await api.patch(`/cobros/${c._id}/anular`, { motivo });
      cargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo anular'));
    }
  };

  const total = cobros.filter((c) => !c.anulado).reduce((a, c) => a + c.monto, 0);
  const deudaTotal = (cuenta || []).filter((p) => p.estado === 'entregado').reduce((a, p) => a + p.total - p.montoPagado, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Cobros</h1>
        <button onClick={abrirNuevo}>+ Registrar cobro</button>
      </div>

      <div className="filter-bar">
        <label className="muted">Desde</label>
        <input
          type="date"
          className="input-inline"
          value={filtros.desde}
          onChange={(e) => {
            const f = { ...filtros, desde: e.target.value };
            setFiltros(f);
            cargar(f);
          }}
        />
        <label className="muted">Hasta</label>
        <input
          type="date"
          className="input-inline"
          value={filtros.hasta}
          onChange={(e) => {
            const f = { ...filtros, hasta: e.target.value };
            setFiltros(f);
            cargar(f);
          }}
        />
        <strong className="total-filtro">Total: {gs(total)}</strong>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Recibo</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Metodo</th>
              <th className="num">Monto</th>
              <th>Recibido por</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cobros.map((c) => (
              <tr key={c._id} className={c.anulado ? 'row-inactivo' : ''}>
                <td>#{c.numero}</td>
                <td>{fechaHora(c.createdAt)}</td>
                <td>{c.cliente?.nombre}</td>
                <td>
                  {METODOS_COBRO[c.metodo]}
                  {c.referencia && <small className="muted block">{c.referencia}</small>}
                </td>
                <td className="num">{gs(c.monto)}</td>
                <td>{c.usuario?.nombre}</td>
                <td>
                  {c.anulado ? (
                    <span className="tag tag-rojo" title={c.motivoAnulacion}>
                      Anulado
                    </span>
                  ) : c.cierre ? (
                    <span className="tag tag-verde">Rendido</span>
                  ) : (
                    <span className="tag">En caja</span>
                  )}
                </td>
                <td>
                  {puedeAnular && !c.anulado && !c.cierre && (
                    <button className="btn-secondary" onClick={() => anular(c)}>
                      Anular
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo="Registrar cobro" onClose={() => setForm(null)} ancho>
          <form className="form" onSubmit={guardar}>
            {error && <div className="alert-error">{error}</div>}
            <label>Cliente</label>
            <select value={form.cliente} onChange={(e) => elegirCliente(e.target.value)} required>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            {cuenta && cuenta.length === 0 && <p className="muted">El cliente no tiene pedidos con saldo.</p>}
            {cuenta && cuenta.length > 0 && (
              <>
                <label>Aplicar a pedidos (si no marca ninguno se aplica a los entregados mas antiguos)</label>
                <table className="table table-compact">
                  <tbody>
                    {cuenta.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <input
                            type="checkbox"
                            className="check-tabla"
                            checked={form.pedidos.includes(p._id)}
                            onChange={() => togglePedido(p)}
                          />
                        </td>
                        <td>{fecha(p.entregadoEn || p.fechaProgramada)}</td>
                        <td>{p.estado.replace('_', ' ')}</td>
                        <td className="num">{gs(p.total - p.montoPagado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted">Deuda de pedidos entregados: {gs(deudaTotal)}</p>
              </>
            )}

            <div className="form-grid">
              <div>
                <label>Monto (Gs.)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Metodo</label>
                <select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}>
                  {Object.entries(METODOS_COBRO).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {form.metodo !== 'efectivo' && (
              <>
                <label>Referencia</label>
                <input
                  value={form.referencia}
                  onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                  placeholder="Nro. de transferencia, voucher o cheque"
                />
              </>
            )}
            <button type="submit">Registrar cobro</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Cobros;
