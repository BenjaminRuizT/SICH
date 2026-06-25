import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ hoy: 0, semana: 0, total: 0 });

  useEffect(() => {
    api.get('/revisiones?limit=1').then(r => setStats(s => ({ ...s, total: r.data.total }))).catch(() => {});
    const hoy = new Date().toISOString().slice(0, 10);
    api.get(`/revisiones?limit=1&desde=${hoy}`).then(r => setStats(s => ({ ...s, hoy: r.data.total }))).catch(() => {});
  }, []);

  const isAdmin = user?.rol === 'admin';

  return (
    <div className="md:ml-56 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.nombre?.split(' ')[0]}</h1>
        <p className="text-gray-500 text-sm mt-1">Sistema Integral de Control de Herramienta de Empleados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Revisiones hoy', value: stats.hoy, icon: '📋', color: 'brand' },
          { label: 'Total revisiones', value: stats.total, icon: '📊', color: 'gray' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold text-brand-700">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="font-bold text-gray-700">Acciones rápidas</h2>
        <button onClick={() => navigate('/nueva')} className="btn-primary text-left flex items-center gap-3 justify-start">
          <span className="text-2xl">➕</span> Nueva revisión
        </button>
        <button onClick={() => navigate('/historial')} className="btn-secondary text-left flex items-center gap-3 justify-start">
          <span className="text-2xl">📋</span> Ver historial
        </button>
        {isAdmin && (
          <button onClick={() => navigate('/admin')} className="btn-secondary text-left flex items-center gap-3 justify-start">
            <span className="text-2xl">⚙️</span> Administración
          </button>
        )}
      </div>
    </div>
  );
}
