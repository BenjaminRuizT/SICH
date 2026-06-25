import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaRevision from './pages/NuevaRevision';
import Historial from './pages/Historial';
import AdminPanel from './pages/admin/AdminPanel';
import Usuarios from './pages/admin/Usuarios';
import Empleados from './pages/admin/Empleados';
import ImportarDatos from './pages/admin/ImportarDatos';
import SinValidar from './pages/admin/SinValidar';
import ResetApp from './pages/admin/ResetApp';
import CartaResponsivaAuto from './pages/CartaResponsivaAuto';
import CartaResponsivaEquipo from './pages/CartaResponsivaEquipo';

function AuthGuard({ children, adminOnly = false, noLayout = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-brand-600 text-lg">Cargando...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.rol !== 'admin') return <Navigate to="/" replace />;
  if (noLayout) return <>{children}</>;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
      <Route path="/nueva" element={<AuthGuard><NuevaRevision /></AuthGuard>} />
      <Route path="/historial" element={<AuthGuard><Historial /></AuthGuard>} />
      <Route path="/admin" element={<AuthGuard adminOnly><AdminPanel /></AuthGuard>} />
      <Route path="/admin/usuarios" element={<AuthGuard adminOnly><Usuarios /></AuthGuard>} />
      <Route path="/admin/empleados" element={<AuthGuard adminOnly><Empleados /></AuthGuard>} />
      <Route path="/admin/importar" element={<AuthGuard adminOnly><ImportarDatos /></AuthGuard>} />
      <Route path="/admin/sin-validar" element={<AuthGuard adminOnly><SinValidar /></AuthGuard>} />
      <Route path="/admin/reset" element={<AuthGuard adminOnly><ResetApp /></AuthGuard>} />
      {/* Cartas responsivas — print pages, sin sidebar */}
      <Route path="/carta/auto/:id" element={<AuthGuard noLayout><CartaResponsivaAuto /></AuthGuard>} />
      <Route path="/carta/equipo/:id" element={<AuthGuard noLayout><CartaResponsivaEquipo /></AuthGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
