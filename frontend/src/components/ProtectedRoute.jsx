import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// roles: lista de roles permitidos (vacio = cualquier usuario autenticado)
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, cargando } = useAuth();

  if (cargando) return <div className="loading-screen">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles.length > 0 && !roles.includes(user.rol)) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
