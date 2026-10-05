import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import Kude from '../components/Kude';
import { useAuth } from '../context/AuthContext';
import { fecha, gs, mensajeError } from '../utils/format';

const ESTADO_SIFEN = {
  pendiente: { texto: 'Pendiente de envio', clase: 'tag' },
  aprobado: { texto: 'Aprobado', clase: 'tag tag-verde' },
  rechazado: { texto: 'Rechazado', clase: 'tag tag-rojo' },
  simulado: { texto: 'Simulado', clase: 'tag tag-azul' },
};

const Facturas = () => {
  const { esAdmin } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [viendo, setViendo] = useState(null);

  const cargar = async () => {
    const { data } = await api.get('/facturas');
    setFacturas(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const ver = async (id) => {
    const { data } = await api.get(`/facturas/${id}`);
    setViendo(data);
  };

  const reenviar = async (id) => {
    try {
      await api.post(`/facturas/${id}/reenviar`);
      cargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo reenviar'));
    }
  };

  const anular = async (f) => {
    const motivo = window.prompt(`Motivo de anulacion de la factura ${f.numero}:`);
    if (!motivo) return;
    try {
      await api.patch(`/facturas/${f._id}/anular`, { motivo });
      cargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo anular'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Facturas</h1>
      </div>
      <p className="muted">Las facturas se emiten desde Pedidos (pedidos entregados). Las garantias de envases no se facturan.</p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Condicion</th>
              <th className="num">Total</th>
              <th className="num">IVA</th>
              <th>SIFEN</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => {
              const estado = ESTADO_SIFEN[f.sifen?.estado] || ESTADO_SIFEN.pendiente;
              return (
                <tr key={f._id} className={f.estado === 'anulada' ? 'row-inactivo' : ''}>
                  <td>
                    {f.numero}
                    {f.estado === 'anulada' && <span className="tag tag-rojo">Anulada</span>}
                  </td>
                  <td>{fecha(f.fecha)}</td>
                  <td>
                    {f.receptor.nombre}
                    <small className="muted block">{f.receptor.documento !== '0' && f.receptor.documento}</small>
                  </td>
                  <td className="capitalize">{f.condicion}</td>
                  <td className="num">{gs(f.totales.total)}</td>
                  <td className="num">{gs(f.totales.iva10 + f.totales.iva5)}</td>
                  <td>
                    <span className={estado.clase} title={f.sifen?.mensaje}>
                      {estado.texto}
                    </span>
                  </td>
                  <td className="acciones">
                    <button className="btn-secondary" onClick={() => ver(f._id)}>
                      Ver / imprimir
                    </button>
                    {f.estado === 'emitida' && ['pendiente', 'rechazado'].includes(f.sifen?.estado) && (
                      <button className="btn-secondary" onClick={() => reenviar(f._id)}>
                        Reenviar
                      </button>
                    )}
                    {esAdmin && f.estado === 'emitida' && (
                      <button className="btn-danger" onClick={() => anular(f)}>
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viendo && (
        <Modal titulo={`Factura ${viendo.factura.numero}`} onClose={() => setViendo(null)} ancho>
          <Kude {...viendo} />
          <button className="btn-imprimir" onClick={() => window.print()}>
            Imprimir
          </button>
        </Modal>
      )}
    </div>
  );
};

export default Facturas;
