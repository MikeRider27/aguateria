import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { rolesDe } from './menu';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import Ruta from './pages/Ruta';
import Envases from './pages/Envases';
import Zonas from './pages/Zonas';
import Usuarios from './pages/Usuarios';

const PAGINAS = [
  ['/ruta', Ruta],
  ['/pedidos', Pedidos],
  ['/clientes', Clientes],
  ['/envases', Envases],
  ['/productos', Productos],
  ['/zonas', Zonas],
  ['/usuarios', Usuarios],
];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            {PAGINAS.map(([ruta, Pagina]) => (
              <Route
                key={ruta}
                path={ruta.slice(1)}
                element={
                  <ProtectedRoute roles={rolesDe(ruta)}>
                    <Pagina />
                  </ProtectedRoute>
                }
              />
            ))}
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
