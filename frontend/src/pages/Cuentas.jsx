import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { enlaceWhatsApp, fecha, gs } from '../utils/format';

const Cuentas = () => {
  const [cuentas, setCuentas] = useState([]);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    api.get('/cuentas').then(({ data }) => setCuentas(data));
  }, []);

  const verDetalle = async (clienteId) => {
    const { data } = await api.get(`/cuentas/${clienteId}`);
    setDetalle(data);
  };

  const total = cuentas.reduce((a, c) => a + c.saldo, 0);
  const vencido = cuentas.reduce((a, c) => a + c.vencido, 0);

  return (
    <div>
      <h1>Cuentas corrientes</h1>
      <div className="stats-grid compact">
        <div className="stat-card">
          <span className="stat-label">Total por cobrar</span>
          <span className="stat-value small">{gs(total)}</span>
          <span className="stat-sub">{cuentas.length} clientes</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vencido</span>
          <span className="stat-value small txt-rojo">{gs(vencido)}</span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Condicion</th>
              <th className="num">Saldo</th>
              <th className="num">Vencido</th>
              <th>Deuda desde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((c) => {
              const wa = enlaceWhatsApp(
                c.cliente.whatsapp,
                `Hola ${c.cliente.nombre}, le recordamos que tiene un saldo pendiente de ${gs(c.saldo)} con la aguateria.`
              );
              return (
                <tr key={c.cliente._id} className={c.vencido > 0 ? 'row-warning' : ''}>
                  <td>
                    {c.cliente.nombre}
                    {wa && (
                      <a className="link-wa" href={wa} target="_blank" rel="noreferrer">
                        Recordar por WhatsApp
                      </a>
                    )}
                  </td>
                  <td>
                    {c.cliente.condicionVenta === 'credito' ? (
                      <>
                        Credito {c.cliente.plazoDias} dias
                        {c.cliente.limiteCredito > 0 && (
                          <small className="muted block">Limite {gs(c.cliente.limiteCredito)}</small>
                        )}
                      </>
                    ) : (
                      'Contado'
                    )}
                  </td>
                  <td className="num">{gs(c.saldo)}</td>
                  <td className="num">{c.vencido > 0 ? <span className="txt-rojo">{gs(c.vencido)}</span> : '—'}</td>
                  <td>{fecha(c.masAntiguo)}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => verDetalle(c.cliente._id)}>
                      Estado de cuenta
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detalle && (
        <Modal titulo={`Estado de cuenta · ${detalle.cliente.nombre}`} onClose={() => setDetalle(null)} ancho>
          <div className="resumen-linea">
            <span>Saldo actual</span>
            <strong>{gs(detalle.saldo)}</strong>
          </div>
          {detalle.creditoDisponible !== null && (
            <div className="resumen-linea">
              <span>Credito disponible</span>
              <strong>{gs(detalle.creditoDisponible)}</strong>
            </div>
          )}
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Detalle</th>
                <th className="num">Debe</th>
                <th className="num">Haber</th>
                <th className="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {detalle.movimientos.map((m) => (
                <tr key={`${m.tipo}-${m.id}`}>
                  <td>{fecha(m.fecha)}</td>
                  <td>
                    {m.descripcion}
                    {m.factura && <small className="muted block">Factura {m.factura}</small>}
                  </td>
                  <td className="num">{m.debe ? gs(m.debe) : ''}</td>
                  <td className="num">{m.haber ? gs(m.haber) : ''}</td>
                  <td className="num">{gs(m.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
};

export default Cuentas;
