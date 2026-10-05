import { useEffect, useState } from 'react';
import api from '../api/axios';
import { gs } from '../utils/format';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.response?.data?.mensaje || 'Error al cargar estadisticas'));
  }, []);

  if (error) return <div className="alert-error">{error}</div>;
  if (!stats) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Ventas de hoy</span>
          <span className="stat-value small">{gs(stats.ventasHoy)}</span>
          <span className="stat-sub">{stats.entregasHoy} entregas (sin garantias)</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pedidos para hoy</span>
          <span className="stat-value">{stats.pedidosParaHoy}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pendientes</span>
          <span className="stat-value">{stats.pedidosPendientes}</span>
          <span className="stat-sub">{stats.pedidosEnCamino} en camino</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Clientes activos</span>
          <span className="stat-value">{stats.totalClientes}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cobrado hoy</span>
          <span className="stat-value small">{gs(stats.cobrosHoy)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cuentas por cobrar</span>
          <span className="stat-value small">{gs(stats.porCobrar)}</span>
          <span className="stat-sub">{stats.clientesConDeuda} clientes</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Envases en clientes</span>
          <span className="stat-value">{stats.envasesEnClientes}</span>
          <span className="stat-sub">{stats.envasesVacios} vacios en planta</span>
        </div>
      </div>

      <h2>Stock bajo</h2>
      {stats.productosStockBajo.length === 0 ? (
        <p>Todo el inventario esta en niveles saludables.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock actual</th>
              <th>Stock minimo</th>
            </tr>
          </thead>
          <tbody>
            {stats.productosStockBajo.map((p) => (
              <tr key={p._id} className="row-warning">
                <td>{p.nombre}</td>
                <td>{p.stock}</td>
                <td>{p.stockMinimo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Dashboard;
