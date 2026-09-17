import { useEffect, useState } from 'react';
import api from '../api/axios';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar estadisticas');
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  if (error) return <div className="alert-error">{error}</div>;
  if (!stats) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Ventas de hoy</span>
          <span className="stat-value">${stats.ventasHoy.toFixed(2)}</span>
          <span className="stat-sub">{stats.pedidosHoy} pedidos</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pedidos pendientes</span>
          <span className="stat-value">{stats.pedidosPendientes}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pedidos en camino</span>
          <span className="stat-value">{stats.pedidosEnCamino}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Clientes activos</span>
          <span className="stat-value">{stats.totalClientes}</span>
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
