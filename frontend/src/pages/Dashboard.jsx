import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../context/AuthContext';
import MiFirmaModal from '../components/MiFirmaModal';
import { fixSignatureBg } from '../utils/signatureUtils';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ hoy: 0, total: 0 });
  const [firmaPreview, setFirmaPreview] = useState(null);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [bloqueadosCount, setBloqueadosCount] = useState(0);

  const isAdmin = user?.rol === 'admin';

  useEffect(() => {
    api.get('/revisiones?limit=1').then(r => setStats(s => ({ ...s, total: r.data.total }))).catch(() => {});
    const hoy = new Date().toISOString().slice(0, 10);
    api.get(`/revisiones?limit=1&desde=${hoy}`).then(r => setStats(s => ({ ...s, hoy: r.data.total }))).catch(() => {});
    api.get('/usuarios/me/firma').then(async r => {
      if (r.data.firma) {
        const fixed = await fixSignatureBg(r.data.firma);
        setFirmaPreview(fixed);
      } else {
        setFirmaPreview(null);
      }
    }).catch(() => {});
    if (isAdmin) {
      api.get('/admin/usuarios-bloqueados').then(r => setBloqueadosCount(r.data.length)).catch(() => {});
    }
  }, [isAdmin]);

  const handleFirmaClose = () => {
    setShowFirmaModal(false);
    // Refresh preview after modal closes
    api.get('/usuarios/me/firma').then(async r => {
      if (r.data.firma) {
        const fixed = await fixSignatureBg(r.data.firma);
        setFirmaPreview(fixed);
      } else {
        setFirmaPreview(null);
      }
    }).catch(() => {});
  };

  return (
    <div className="md:ml-56 space-y-6">
      {showFirmaModal && <MiFirmaModal nombre={user?.nombre} onClose={handleFirmaClose} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.nombre?.split(' ')[0]}</h1>
        <p className="text-gray-500 text-sm mt-1">Sistema de Control de Herramienta</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Revisiones hoy', value: stats.hoy, icon: '📋' },
          { label: 'Total revisiones', value: stats.total, icon: '📊' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold text-brand-700">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerta admin: cuentas bloqueadas */}
      {isAdmin && bloqueadosCount > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-bold text-red-800 text-sm">
                {bloqueadosCount} cuenta{bloqueadosCount !== 1 ? 's' : ''} bloqueada{bloqueadosCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600">Demasiados intentos de inicio de sesión fallidos</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/usuarios')}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 shrink-0"
          >
            Gestionar
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="font-bold text-gray-700">Acciones rápidas</h2>
        <button onClick={() => navigate('/nueva')} className="btn-primary text-left flex items-center gap-3 justify-start w-full">
          <span className="text-2xl">➕</span> Nueva revisión
        </button>
        <button onClick={() => navigate('/historial')} className="btn-secondary text-left flex items-center gap-3 justify-start w-full">
          <span className="text-2xl">📋</span> Ver historial
        </button>

        {/* Firma del auditor */}
        <button
          onClick={() => setShowFirmaModal(true)}
          className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all
            border-gray-200 hover:border-brand-400 bg-white hover:bg-brand-50"
        >
          <div className="shrink-0">
            {firmaPreview
              ? <img src={firmaPreview} alt="Mi firma" className="h-10 w-20 object-contain border border-gray-200 rounded-lg bg-gray-50" />
              : <div className="h-10 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">Sin firma</div>
            }
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm">Mi firma</p>
            <p className="text-xs text-gray-500 truncate">
              {firmaPreview ? 'Firma guardada — toca para actualizar' : 'Toca para capturar tu firma de auditor'}
            </p>
          </div>
          <span className="ml-auto text-gray-400 text-lg shrink-0">✍</span>
        </button>

        {isAdmin && (
          <button onClick={() => navigate('/admin')} className="btn-secondary text-left flex items-center gap-3 justify-start w-full">
            <span className="text-2xl">⚙️</span> Administración
          </button>
        )}

        <button
          onClick={() => navigate('/manual')}
          className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-gray-200 hover:border-teal-400 bg-white hover:bg-teal-50 transition-all"
        >
          <span className="text-2xl shrink-0">📖</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Manual de usuario</p>
            <p className="text-xs text-gray-500">Guía de funciones, revisiones y confidencialidad</p>
          </div>
        </button>
      </div>
    </div>
  );
}
