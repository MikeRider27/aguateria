import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { enlaceWhatsApp, fecha, mensajeError } from '../utils/format';

const OPERACIONES = {
  llenado: 'Llenado (vacios → llenos)',
  baja: 'Baja por daño (vacios → dañados)',
  ingreso: 'Ingreso de envases nuevos',
  descarte: 'Descarte de dañados',
};

const Envases = () => {
  const [resumen, setResumen] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [diasSinMovimiento, setDiasSinMovimiento] = useState('');
  const [operacion, setOperacion] = useState(null);
  const [ajuste, setAjuste] = useState(null);
  const [error, setError] = useState('');
  const { esAdmin } = useAuth();

  const cargar = async (dias = diasSinMovimiento) => {
    const [r, c] = await Promise.all([
      api.get('/envases/resumen'),
      api.get('/envases/clientes', { params: dias ? { diasSinMovimiento: dias } : {} }),
    ]);
    setResumen(r.data);
    setClientes(c.data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const enviarOperacion = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/products/${operacion.producto._id}/envases`, {
        operacion: operacion.tipo,
        cantidad: Number(operacion.cantidad),
      });
      setOperacion(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la operacion'));
    }
  };

  const enviarAjuste = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/envases/ajustes', {
        cliente: ajuste.cliente._id,
        producto: ajuste.producto._id,
        cantidad: Number(ajuste.cantidad),
        nota: ajuste.nota,
      });
      setAjuste(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el ajuste'));
    }
  };

  return (
    <div>
      <h1>Envases retornables</h1>

      <div className="stats-grid">
        {resumen.map((p) => (
          <div className="stat-card" key={p._id}>
            <span className="stat-label">
              {p.nombre} {p.presentacion}
            </span>
            <span className="stat-value">{p.total}</span>
            <span className="stat-sub">envases en total</span>
            <dl className="desglose">
              <dt>Llenos</dt>
              <dd>{p.llenos}</dd>
              <dt>Vacios en planta</dt>
              <dd>{p.vacios}</dd>
              <dt>En clientes</dt>
              <dd>{p.enClientes}</dd>
              <dt>Dañados</dt>
              <dd>{p.danados}</dd>
            </dl>
            {esAdmin && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setError('');
                  setOperacion({ producto: p, tipo: 'llenado', cantidad: 1 });
                }}
              >
                Registrar movimiento
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="page-header">
        <h2>Envases en poder de clientes</h2>
        <select
          className="select-inline"
          value={diasSinMovimiento}
          onChange={(e) => {
            setDiasSinMovimiento(e.target.value);
            cargar(e.target.value);
          }}
        >
          <option value="">Todos</option>
          <option value="30">Sin movimiento hace +30 dias</option>
          <option value="60">Sin movimiento hace +60 dias</option>
          <option value="90">Sin movimiento hace +90 dias</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Zona</th>
              <th>Envase</th>
              <th>Saldo</th>
              <th>Ultimo movimiento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((f) => (
              <tr key={`${f.cliente?._id}-${f.producto?._id}`} className={f.saldo < 0 ? 'row-warning' : ''}>
                <td>
                  {f.cliente?.nombre}
                  {enlaceWhatsApp(f.cliente?.whatsapp) && (
                    <a
                      className="link-wa"
                      href={enlaceWhatsApp(
                        f.cliente.whatsapp,
                        `Hola ${f.cliente.nombre}, le escribimos de la aguateria por ${f.saldo} envase(s) que tiene en su poder.`
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  )}
                </td>
                <td>{f.cliente?.zona?.nombre || '—'}</td>
                <td>{f.producto?.presentacion}</td>
                <td>
                  <strong>{f.saldo}</strong>
                </td>
                <td>{fecha(f.ultimoMovimiento)}</td>
                <td>
                  {esAdmin && (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setError('');
                        setAjuste({ cliente: f.cliente, producto: f.producto, cantidad: '', nota: '' });
                      }}
                    >
                      Ajustar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {operacion && (
        <Modal
          titulo={`${operacion.producto.nombre} ${operacion.producto.presentacion}`}
          onClose={() => setOperacion(null)}
        >
          <form className="form" onSubmit={enviarOperacion}>
            {error && <div className="alert-error">{error}</div>}
            <label>Operacion</label>
            <select value={operacion.tipo} onChange={(e) => setOperacion({ ...operacion, tipo: e.target.value })}>
              {Object.entries(OPERACIONES).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
            <label>Cantidad</label>
            <input
              type="number"
              min="1"
              value={operacion.cantidad}
              onChange={(e) => setOperacion({ ...operacion, cantidad: e.target.value })}
              required
            />
            <button type="submit">Registrar</button>
          </form>
        </Modal>
      )}

      {ajuste && (
        <Modal titulo={`Ajustar saldo de ${ajuste.cliente.nombre}`} onClose={() => setAjuste(null)}>
          <form className="form" onSubmit={enviarAjuste}>
            {error && <div className="alert-error">{error}</div>}
            <p className="muted">
              Use un numero positivo si el cliente tiene mas envases de los registrados, o negativo si tiene menos
              (ej: envase perdido o roto que el cliente pago).
            </p>
            <label>Cantidad (+/-)</label>
            <input
              type="number"
              value={ajuste.cantidad}
              onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })}
              required
            />
            <label>Motivo</label>
            <input value={ajuste.nota} onChange={(e) => setAjuste({ ...ajuste, nota: e.target.value })} required />
            <button type="submit">Guardar ajuste</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Envases;
