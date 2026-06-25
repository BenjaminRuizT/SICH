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

function AuthGuard({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-brand-600 text-lg">Cargando...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.rol !== 'admin') return <Navigate to="/" replace />;
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
