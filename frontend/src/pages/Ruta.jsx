import { useEffect, useState } from 'react';
import api from '../api/axios';
import EntregaModal from '../components/EntregaModal';
import { useAuth } from '../context/AuthContext';
import { enlaceMapa, enlaceWhatsApp, fecha, gs, hoyISO, mensajeError } from '../utils/format';

// Hoja de ruta diaria. Pensada para usarse desde el celular del repartidor.
const Ruta = () => {
  const { user, esAdmin } = useAuth();
  const [dia, setDia] = useState(hoyISO());
  const [repartidor, setRepartidor] = useState('');
  const [repartidores, setRepartidores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [entregando, setEntregando] = useState(null);

  const cargar = async (f = dia, r = repartidor) => {
    const params = { fecha: f };
    if (r) params.repartidor = r;
    const [ruta, sugeridas] = await Promise.all([api.get('/ruta', { params }), api.get('/ruta/visitas', { params })]);
    setPedidos(ruta.data.pedidos);
    setVisitas(sugeridas.data);
  };

  useEffect(() => {
    cargar();
    if (esAdmin) api.get('/users/repartidores').then(({ data }) => setRepartidores(data));
  }, []);

  const enCamino = async (id) => {
    try {
      await api.patch(`/orders/${id}/estado`, { estado: 'en_camino' });
      cargar();
    } catch (err) {
      window.alert(mensajeError(err, 'No se pudo actualizar'));
    }
  };

  const pendientes = pedidos.filter((p) => p.estado !== 'entregado');
  const entregados = pedidos.filter((p) => p.estado === 'entregado');
  const bidones = pendientes.reduce(
    (acc, p) => acc + p.items.filter((i) => i.retornable).reduce((a, i) => a + i.cantidad, 0),
    0
  );
  const aCobrar = pendientes
    .filter((p) => p.condicion !== 'credito')
    .reduce((acc, p) => acc + p.total - (p.montoPagado || 0), 0);

  return (
    <div className="ruta">
      <div className="page-header">
        <h1>{esAdmin ? 'Hoja de ruta' : `Mi ruta, ${user?.nombre?.split(' ')[0]}`}</h1>
      </div>

      <div className="filter-bar">
        <input
          type="date"
          className="input-inline"
          value={dia}
          onChange={(e) => {
            setDia(e.target.value);
            cargar(e.target.value);
          }}
        />
        {esAdmin && (
          <select
            className="select-inline"
            value={repartidor}
            onChange={(e) => {
              setRepartidor(e.target.value);
              cargar(dia, e.target.value);
            }}
          >
            <option value="">Todos los repartidores</option>
            <option value="sin_asignar">Sin asignar</option>
            {repartidores.map((r) => (
              <option key={r._id} value={r._id}>
                {r.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="stats-grid compact">
        <div className="stat-card">
          <span className="stat-label">Por entregar</span>
          <span className="stat-value">{pendientes.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Bidones a cargar</span>
          <span className="stat-value">{bidones}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">A cobrar</span>
          <span className="stat-value small">{gs(aCobrar)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Entregados</span>
          <span className="stat-value">{entregados.length}</span>
        </div>
      </div>

      {pendientes.length === 0 && <p className="muted">No hay entregas pendientes para este dia.</p>}

      <div className="tarjetas">
        {pendientes.map((p) => {
          const wa = enlaceWhatsApp(p.cliente?.whatsapp, `Hola ${p.cliente?.nombre}, su pedido de agua esta en camino.`);
          return (
            <div className={`tarjeta ${p.atrasado ? 'tarjeta-atrasada' : ''}`} key={p._id}>
              <div className="tarjeta-header">
                <strong>{p.cliente?.nombre}</strong>
                <span className={`badge badge-${p.estado}`}>{p.estado.replace('_', ' ')}</span>
              </div>
              <div className="muted">
                {p.zona?.nombre || 'Sin zona'}
                {p.atrasado && ` · atrasado (${fecha(p.fechaProgramada)})`}
                {esAdmin && ` · ${p.repartidor?.nombre || 'sin repartidor'}`}
              </div>
              <a href={enlaceMapa({ ...p.cliente, direccion: p.direccionEntrega })} target="_blank" rel="noreferrer">
                {p.direccionEntrega}
              </a>
              {p.cliente?.referencia && <div className="muted">Ref: {p.cliente.referencia}</div>}
              <ul className="lista-simple">
                {p.items.map((i) => (
                  <li key={i.producto}>
                    {i.cantidad} × {i.nombreProducto}
                  </li>
                ))}
              </ul>
              {p.notas && <div className="nota">{p.notas}</div>}
              <div className="tarjeta-total">
                {gs(p.total)}
                {p.condicion === 'credito' && <span className="tag tag-azul">Credito</span>}
              </div>
              <div className="tarjeta-acciones">
                <a className="btn btn-secondary" href={`tel:${p.cliente?.telefono}`}>
                  Llamar
                </a>
                {wa && (
                  <a className="btn btn-wa" href={wa} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
                {p.estado === 'pendiente' && (
                  <button className="btn-secondary" onClick={() => enCamino(p._id)}>
                    En camino
                  </button>
                )}
                <button onClick={() => setEntregando(p)}>Entregar</button>
              </div>
            </div>
          );
        })}
      </div>

      {visitas.length > 0 && (
        <>
          <h2>Clientes de la zona sin pedido hoy</h2>
          <p className="muted">Clientes de las zonas que se visitan este dia. Ofreceles reposicion.</p>
          <ul className="lista-visitas">
            {visitas.map((c) => (
              <li key={c._id}>
                <span>
                  <strong>{c.nombre}</strong> · {c.zona?.nombre}
                  <small className="muted block">{c.direccion}</small>
                </span>
                {enlaceWhatsApp(c.whatsapp) && (
                  <a
                    className="btn btn-wa"
                    href={enlaceWhatsApp(c.whatsapp, `Hola ${c.nombre}, hoy pasamos por su zona. ¿Necesita agua?`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ofrecer
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {entregados.length > 0 && (
        <>
          <h2>Entregados</h2>
          <ul className="lista-visitas">
            {entregados.map((p) => (
              <li key={p._id}>
                <span>
                  <strong>{p.cliente?.nombre}</strong> · {gs(p.total)}
                  <small className="muted block">
                    Retiro {p.envasesRetirados.reduce((a, r) => a + r.cantidad, 0)} vacio(s)
                  </small>
                </span>
                <span className="badge badge-entregado">entregado</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {entregando && (
        <EntregaModal
          pedido={entregando}
          onClose={() => setEntregando(null)}
          onEntregado={() => {
            setEntregando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
};

export default Ruta;
