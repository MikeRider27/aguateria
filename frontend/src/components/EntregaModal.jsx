import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from './Modal';
import { gs, METODOS_PAGO, mensajeError } from '../utils/format';

// Confirma la entrega de un pedido registrando los envases vacios que se retiran
const EntregaModal = ({ pedido, onClose, onEntregado }) => {
  const [saldos, setSaldos] = useState([]);
  const [retiros, setRetiros] = useState({});
  const [metodoPago, setMetodoPago] = useState(pedido.metodoPago);
  const saldoPedido = pedido.total - (pedido.montoPagado || 0);
  // Contado: se cobra todo al entregar. Credito: queda en cuenta corriente salvo que pague algo.
  const [montoCobrado, setMontoCobrado] = useState(pedido.condicion === 'credito' ? 0 : saldoPedido);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entregados = pedido.items.filter((i) => i.retornable);

  useEffect(() => {
    api.get(`/clients/${pedido.cliente._id}/envases`).then(({ data }) => {
      setSaldos(data.saldos);
      // Por defecto se asume canje 1 a 1 (vacio por lleno), limitado al saldo previo del cliente
      const iniciales = {};
      entregados.forEach((i) => {
        const previo = data.saldos.find((s) => s.producto?._id === i.producto)?.saldo || 0;
        iniciales[i.producto] = Math.min(previo, i.cantidad);
      });
      setRetiros(iniciales);
    });
  }, [pedido]);

  // Productos retornables involucrados: los del pedido y los que el cliente ya tiene
  const productos = new Map();
  entregados.forEach((i) => productos.set(i.producto, { nombre: i.nombreProducto, entrega: i.cantidad }));
  saldos.forEach((s) => {
    if (!s.producto) return;
    const actual = productos.get(s.producto._id) || {
      nombre: `${s.producto.nombre} ${s.producto.presentacion}`,
      entrega: 0,
    };
    productos.set(s.producto._id, { ...actual, saldo: s.saldo });
  });

  const confirmar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.patch(`/orders/${pedido._id}/entregar`, {
        metodoPago,
        montoCobrado: Number(montoCobrado || 0),
        referenciaPago,
        retiros: Object.entries(retiros)
          .filter(([, cantidad]) => Number(cantidad) > 0)
          .map(([producto, cantidad]) => ({ producto, cantidad: Number(cantidad) })),
      });
      onEntregado();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la entrega'));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={`Entregar a ${pedido.cliente?.nombre}`} onClose={onClose}>
      <form className="form" onSubmit={confirmar}>
        {error && <div className="alert-error">{error}</div>}
        <ul className="lista-simple">
          {pedido.items.map((i) => (
            <li key={i.producto}>
              {i.cantidad} × {i.nombreProducto}
            </li>
          ))}
        </ul>
        <div className="total-estimado">
          Total del pedido: {gs(pedido.total)}
          {pedido.condicion === 'credito' && <span className="tag tag-azul">Credito</span>}
          {pedido.montoPagado > 0 && <small className="muted block">Ya pagado: {gs(pedido.montoPagado)}</small>}
        </div>

        {productos.size > 0 && (
          <>
            <label>Envases vacios retirados</label>
            {[...productos.entries()].map(([id, p]) => (
              <div className="item-row" key={id}>
                <span className="item-label">
                  {p.nombre}
                  <small>
                    Tenia {p.saldo || 0} · entrega {p.entrega}
                  </small>
                </span>
                <input
                  type="number"
                  min="0"
                  max={(p.saldo || 0) + p.entrega}
                  value={retiros[id] ?? 0}
                  onChange={(e) => setRetiros({ ...retiros, [id]: e.target.value })}
                />
              </div>
            ))}
          </>
        )}

        <label>Metodo de pago</label>
        <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
          {Object.entries(METODOS_PAGO).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>

        <label>Monto cobrado (Gs.)</label>
        <input
          type="number"
          min="0"
          max={saldoPedido}
          step="1"
          value={montoCobrado}
          onChange={(e) => setMontoCobrado(e.target.value)}
        />
        {metodoPago !== 'efectivo' && Number(montoCobrado) > 0 && (
          <>
            <label>Referencia del pago</label>
            <input
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              placeholder="Nro. de transferencia o comprobante"
            />
          </>
        )}
        {Number(montoCobrado) < saldoPedido && (
          <p className="muted">Quedan {gs(saldoPedido - Number(montoCobrado || 0))} en la cuenta corriente del cliente.</p>
        )}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Registrando...' : 'Confirmar entrega'}
        </button>
      </form>
    </Modal>
  );
};

export default EntregaModal;
