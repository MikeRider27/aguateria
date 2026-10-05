import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { fechaHora, gs, mensajeError, METODOS_COBRO } from '../utils/format';

const Caja = () => {
  const { tieneRol } = useAuth();
  const puedeCerrar = tieneRol('admin', 'cajero');
  const [pendientes, setPendientes] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [cerrando, setCerrando] = useState(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    const [p, c] = await Promise.all([api.get('/caja/pendientes'), api.get('/caja/cierres')]);
    setPendientes(p.data);
    setCierres(c.data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const cerrar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/caja/cierres', {
        usuario: cerrando.grupo.usuario._id,
        efectivoDeclarado: Number(cerrando.efectivoDeclarado),
        observacion: cerrando.observacion,
      });
      setCerrando(null);
      cargar();
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cerrar la caja'));
    }
  };

  const diferencia = cerrando ? Number(cerrando.efectivoDeclarado || 0) - cerrando.grupo.totales.efectivo : 0;

  return (
    <div>
      <h1>Caja y rendiciones</h1>

      <h2>Pendiente de rendir</h2>
      {pendientes.length === 0 && <p className="muted">No hay cobros pendientes de rendir.</p>}
      {pendientes.map((g) => (
        <div className="grupo-caja" key={g.usuario._id}>
          <div className="page-header">
            <div>
              <strong>{g.usuario.nombre}</strong>
              <small className="muted block">{g.cobros.length} cobro(s)</small>
            </div>
            <div className="stat-value small">{gs(g.total)}</div>
          </div>
          {Object.entries(g.totales)
            .filter(([, v]) => v > 0)
            .map(([metodo, monto]) => (
              <div className="resumen-linea" key={metodo}>
                <span>{METODOS_COBRO[metodo]}</span>
                <span>{gs(monto)}</span>
              </div>
            ))}
          <details>
            <summary className="muted">Ver cobros</summary>
            <table className="table table-compact">
              <tbody>
                {g.cobros.map((c) => (
                  <tr key={c._id}>
                    <td>#{c.numero}</td>
                    <td>{fechaHora(c.createdAt)}</td>
                    <td>{c.cliente?.nombre}</td>
                    <td>{METODOS_COBRO[c.metodo]}</td>
                    <td className="num">{gs(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          {puedeCerrar && (
            <button
              onClick={() => {
                setError('');
                setCerrando({ grupo: g, efectivoDeclarado: g.totales.efectivo, observacion: '' });
              }}
            >
              Recibir rendicion y cerrar
            </button>
          )}
        </div>
      ))}

      <h2>Cierres anteriores</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Rindio</th>
              <th>Recibio</th>
              <th className="num">Total</th>
              <th className="num">Efectivo sistema</th>
              <th className="num">Efectivo declarado</th>
              <th className="num">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {cierres.map((c) => (
              <tr key={c._id} className={c.diferencia !== 0 ? 'row-warning' : ''}>
                <td>{fechaHora(c.createdAt)}</td>
                <td>{c.usuario?.nombre}</td>
                <td>{c.recibidoPor?.nombre}</td>
                <td className="num">{gs(c.total)}</td>
                <td className="num">{gs(c.totales.efectivo)}</td>
                <td className="num">{gs(c.efectivoDeclarado)}</td>
                <td className={`num ${c.diferencia < 0 ? 'txt-rojo' : c.diferencia > 0 ? 'txt-verde' : ''}`} title={c.observacion}>
                  {gs(c.diferencia)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cerrando && (
        <Modal titulo={`Cierre de caja · ${cerrando.grupo.usuario.nombre}`} onClose={() => setCerrando(null)}>
          <form className="form" onSubmit={cerrar}>
            {error && <div className="alert-error">{error}</div>}
            <div className="resumen-linea">
              <span>Total cobrado</span>
              <strong>{gs(cerrando.grupo.total)}</strong>
            </div>
            <div className="resumen-linea">
              <span>Efectivo segun sistema</span>
              <strong>{gs(cerrando.grupo.totales.efectivo)}</strong>
            </div>
            <label>Efectivo contado (Gs.)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={cerrando.efectivoDeclarado}
              onChange={(e) => setCerrando({ ...cerrando, efectivoDeclarado: e.target.value })}
              required
            />
            {diferencia !== 0 && (
              <div className={diferencia < 0 ? 'alert-error' : 'alert-info'}>
                {diferencia < 0 ? 'Faltante' : 'Sobrante'} de {gs(Math.abs(diferencia))}
              </div>
            )}
            <label>Observacion</label>
            <input
              value={cerrando.observacion}
              onChange={(e) => setCerrando({ ...cerrando, observacion: e.target.value })}
            />
            <button type="submit">Confirmar cierre</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Caja;
