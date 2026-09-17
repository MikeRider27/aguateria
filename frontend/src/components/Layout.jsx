import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout, esAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">💧 Aguateria</div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/pedidos" className={({ isActive }) => (isActive ? 'active' : '')}>
            Pedidos
          </NavLink>
          <NavLink to="/clientes" className={({ isActive }) => (isActive ? 'active' : '')}>
            Clientes
          </NavLink>
          {esAdmin && (
            <NavLink to="/productos" className={({ isActive }) => (isActive ? 'active' : '')}>
              Productos
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user?.nombre}</strong>
            <span>{user?.rol}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
