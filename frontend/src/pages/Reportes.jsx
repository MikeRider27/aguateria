import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { enlaceWhatsApp, fecha, gs, hoyISO, numero } from '../utils/format';

const haceDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TablaGrupo = ({ titulo, filas, columnaNombre }) => (
  <div>
    <h2>{titulo}</h2>
    <table className="table table-compact">
      <thead>
        <tr>
          <th>{columnaNombre}</th>
          <th className="num">Pedidos</th>
          <th className="num">Bidones</th>
          <th className="num">Ventas</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f._id || 'sin'}>
            <td>{f.nombre}</td>
            <td className="num">{f.pedidos}</td>
            <td className="num">{f.bidones}</td>
            <td className="num">{gs(f.ventas)}</td>
          </tr>
        ))}
        {filas.length === 0 && (
          <tr>
            <td colSpan={4} className="muted">
              Sin datos en el periodo
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const Ventas = () => {
  const [rango, setRango] = useState({ desde: haceDias(30), hasta: hoyISO() });
  const [datos, setDatos] = useState(null);

  const cargar = async (r = rango) => {
    const { data } = await api.get('/reportes/ventas', { params: r });
    setDatos(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiar = (campo) => (e) => {
    const r = { ...rango, [campo]: e.target.value };
    setRango(r);
    cargar(r);
  };

  if (!datos) return <p>Cargando...</p>;
  const r = datos.resumen;

  return (
    <>
      <div className="filter-bar">
        <label className="muted">Desde</label>
        <input type="date" className="input-inline" value={rango.desde} onChange={cambiar('desde')} />
        <label className="muted">Hasta</label>
        <input type="date" className="input-inline" value={rango.hasta} onChange={cambiar('hasta')} />
      </div>
      <p className="muted">Pedidos entregados en el periodo. Las ventas no incluyen garantias de envases.</p>
      <div className="stats-grid compact">
        <div className="stat-card">
          <span className="stat-label">Ventas</span>
          <span className="stat-value small">{gs(r.ventas)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pedidos entregados</span>
          <span className="stat-value">{numero(r.pedidos)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Bidones entregados</span>
          <span className="stat-value">{numero(r.bidones)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ticket promedio</span>
          <span className="stat-value small">{gs(r.ticketPromedio)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Clientes atendidos</span>
          <span className="stat-value">{numero(r.clientes)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Garantias cobradas</span>
          <span className="stat-value small">{gs(r.garantias)}</span>
        </div>
      </div>
      <div className="reporte-grid">
        <TablaGrupo titulo="Por zona" filas={datos.porZona} columnaNombre="Zona" />
        <TablaGrupo titulo="Por repartidor" filas={datos.porRepartidor} columnaNombre="Repartidor" />
      </div>
      <div className="reporte-grid">
        <div>
          <h2>Por producto</h2>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Cantidad</th>
                <th className="num">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {datos.porProducto.map((p) => (
                <tr key={p.nombre}>
                  <td>{p.nombre}</td>
                  <td className="num">{numero(p.cantidad)}</td>
                  <td className="num">{gs(p.ventas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h2>Por dia</h2>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Dia</th>
                <th className="num">Pedidos</th>
                <th className="num">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {datos.porDia.map((d) => (
                <tr key={d.dia}>
                  <td>{fecha(`${d.dia}T12:00:00`)}</td>
                  <td className="num">{d.pedidos}</td>
                  <td className="num">{gs(d.ventas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const Inactivos = () => {
  const [dias, setDias] = useState(30);
  const [filas, setFilas] = useState([]);

  const cargar = async (d = dias) => {
    const { data } = await api.get('/reportes/clientes-inactivos', { params: { dias: d } });
    setFilas(data);
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <>
      <div className="filter-bar">
        <label className="muted">Sin compras hace mas de</label>
        <select
          className="select-inline"
          value={dias}
          onChange={(e) => {
            setDias(e.target.value);
            cargar(e.target.value);
          }}
        >
          {[15, 30, 60, 90].map((d) => (
            <option key={d} value={d}>
              {d} dias
            </option>
          ))}
        </select>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Zona</th>
            <th>Ultima compra</th>
            <th className="num">Compras</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const wa = enlaceWhatsApp(f.cliente.whatsapp, `Hola ${f.cliente.nombre}, ¿le llevamos agua esta semana?`);
            return (
              <tr key={f.cliente._id}>
                <td>{f.cliente.nombre}</td>
                <td>{f.cliente.zona?.nombre || '—'}</td>
                <td>{f.ultimaCompra ? fecha(f.ultimaCompra) : 'Nunca compro'}</td>
                <td className="num">{f.compras}</td>
                <td>
                  {wa && (
                    <a className="btn btn-wa" href={wa} target="_blank" rel="noreferrer">
                      Contactar
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
          {filas.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No hay clientes inactivos en ese periodo
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

const Comodatos = () => {
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    api.get('/reportes/comodatos').then(({ data }) => setFilas(data));
  }, []);

  return (
    <>
      <p className="muted">Bidones entregados en los ultimos 30 dias a clientes con dispensador en comodato, contra el minimo pactado.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Cliente</th>
            <th>Desde</th>
            <th className="num">Consumo 30 dias</th>
            <th className="num">Minimo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.equipo._id} className={f.cumple ? '' : 'row-warning'}>
              <td>{f.equipo.codigo}</td>
              <td>{f.cliente?.nombre}</td>
              <td>{fecha(f.desde)}</td>
              <td className="num">{f.consumo30Dias}</td>
              <td className="num">{f.minimoMensual}</td>
              <td>{f.cumple ? <span className="tag tag-verde">Cumple</span> : <span className="tag tag-rojo">Bajo el minimo</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

const PESTANAS = { ventas: ['Ventas', Ventas], inactivos: ['Clientes inactivos', Inactivos], comodatos: ['Comodatos', Comodatos] };

const Reportes = () => {
  const [pestana, setPestana] = useState('ventas');
  const Contenido = PESTANAS[pestana][1];
  return (
    <div>
      <h1>Reportes</h1>
      <div className="filter-bar">
        {Object.entries(PESTANAS).map(([k, [t]]) => (
          <button key={k} className={pestana === k ? 'chip active' : 'chip'} onClick={() => setPestana(k)}>
            {t}
          </button>
        ))}
        <Link className="chip enlace-chip" to="/envases">
          Envases sin retorno →
        </Link>
      </div>
      <Contenido />
    </div>
  );
};

export default Reportes;
