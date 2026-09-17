import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, soloAdmin = false }) => {
  const { user, cargando } = useAuth();

  if (cargando) return <div className="loading-screen">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (soloAdmin && user.rol !== 'admin') return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
