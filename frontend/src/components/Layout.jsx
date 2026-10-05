import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLES, useAuth } from '../context/AuthContext';
import { MENU } from '../menu';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const items = MENU.filter((m) => !m.roles || m.roles.includes(user?.rol));

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="btn-menu" onClick={() => setAbierto(!abierto)} aria-label="Menu">
          ☰
        </button>
        <span className="brand">💧 Aguateria</span>
      </header>
      <aside className={abierto ? 'sidebar abierto' : 'sidebar'}>
        <div className="brand">💧 Aguateria</div>
        <nav>
          {items.map((m) => (
            <NavLink
              key={m.ruta}
              to={m.ruta}
              end={m.ruta === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setAbierto(false)}
            >
              {m.texto}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user?.nombre}</strong>
            <span>{ROLES[user?.rol] || user?.rol}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </aside>
      {abierto && <div className="sidebar-backdrop" onClick={() => setAbierto(false)} />}
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
