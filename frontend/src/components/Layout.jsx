import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import useInactivity from '../hooks/useInactivity';
import useVersionCheck from '../hooks/useVersionCheck';
import { APP_VERSION } from '../version';

const NAV_AUDITOR = [
  { to: '/', label: '🏠 Inicio', exact: true },
  { to: '/nueva', label: '➕ Nueva Revisión' },
  { to: '/historial', label: '📋 Historial' },
  { to: '/sin-validar', label: '🔍 Sin Validar' },
];
const NAV_ADMIN = [
  ...NAV_AUDITOR,
  { to: '/admin', label: '⚙️ Administración' },
];

const THEMES = [
  { id: 'slate',  label: 'Gris',        hex: '#334155' },
  { id: 'navy',   label: 'Azul Marina', hex: '#1e3a8a' },
  { id: 'forest', label: 'Verde Bosque',hex: '#166534' },
];

function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => localStorage.getItem('sich-theme') || 'slate');
  const ref = useRef(null);

  useEffect(() => {
    const theme = current === 'teal' ? null : current;
    document.documentElement.setAttribute('data-theme', theme || '');
    if (!theme) document.documentElement.removeAttribute('data-theme');
  }, [current]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (id) => {
    setCurrent(id);
    localStorage.setItem('sich-theme', id);
    setOpen(false);
  };

  const t = THEMES.find(t => t.id === current);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Cambiar color"
        className="flex items-center gap-1.5 text-xs bg-brand-800 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-lg transition-colors"
      >
        <span className="w-3 h-3 rounded-full inline-block border border-white/40" style={{ background: t.hex }} />
        <span className="hidden sm:inline">{t.label}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-50 min-w-[160px]">
          <p className="text-xs text-gray-400 px-2 pb-1 font-semibold">Color de tema</p>
          <div className="max-h-72 overflow-y-auto">
          {THEMES.map(th => (
            <button
              key={th.id}
              onClick={() => select(th.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${current === th.id ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
            >
              <span className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" style={{ background: th.hex }} />
              {th.label}
              {current === th.id && <span className="ml-auto text-brand-700">✓</span>}
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EyeIcon = ({ open }) => open ? (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
) : (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

function CambiarPasswordModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ current: '', nueva: '', confirmar: '' });
  const [show, setShow] = useState({ current: false, nueva: false, confirmar: false });
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.nueva !== form.confirmar) { setError('Las contraseñas nuevas no coinciden'); return; }
    if (form.nueva.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await axios.put('/api/usuarios/me/password', { current_password: form.current, new_password: form.nueva });
      setOk(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Cambiar contraseña</h2>
          {!ok && <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>}
        </div>
        {ok ? (
          <div className="space-y-2">
            <p className="text-green-700 bg-green-50 rounded-lg px-3 py-2 text-sm">Contraseña actualizada. Cerrando sesión...</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {[
              { key: 'current', label: 'Contraseña actual' },
              { key: 'nueva', label: 'Nueva contraseña' },
              { key: 'confirmar', label: 'Confirmar nueva contraseña' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={show[key] ? 'text' : 'password'}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required
                  />
                  <button type="button" onClick={() => toggle(key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <EyeIcon open={show[key]} />
                  </button>
                </div>
              </div>
            ))}
            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Guardando...' : 'Cambiar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.rol === 'admin';
  const nav = isAdmin ? NAV_ADMIN : NAV_AUDITOR;
  const [inactivityMs, setInactivityMs] = useState(20 * 60 * 1000);
  const [showPwdModal, setShowPwdModal] = useState(false);

  // Restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('sich-theme') || 'slate';
    if (saved !== 'teal') document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(cfg => {
      const mins = parseInt(cfg.inactivity_minutes);
      if (!isNaN(mins) && mins > 0) setInactivityMs(mins * 60000);
    }).catch(() => {});
  }, []);

  useInactivity(async () => { await logout(); navigate('/login'); }, inactivityMs);
  const updateAvailable = useVersionCheck();

  return (
    <div className="min-h-screen flex flex-col">
      {showPwdModal && <CambiarPasswordModal onClose={() => setShowPwdModal(false)} onSuccess={async () => { await logout(); navigate('/login'); }} />}
      {/* Update banner */}
      {updateAvailable && (
        <div className="bg-amber-400 text-amber-900 text-sm font-semibold px-4 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-50 shadow">
          <span>🔄 Nueva versión disponible</span>
          <button
            onClick={() => window.location.reload(true)}
            className="bg-amber-900 text-amber-50 px-4 py-1 rounded-lg hover:bg-amber-800 transition-colors text-xs font-bold"
          >
            Actualizar ahora
          </button>
        </div>
      )}
      {/* Top bar */}
      <header className="bg-brand-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SICH" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20" />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight">SICH</span>
              <span className="text-brand-300 text-[10px]">v{APP_VERSION}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <button
              onClick={() => setShowPwdModal(true)}
              title="Cambiar contraseña"
              className="text-sm text-brand-200 hidden md:inline hover:text-white transition-colors"
            >
              {user?.nombre}
            </button>
            <button
              onClick={async () => { await logout(); navigate('/login'); }}
              className="text-xs bg-brand-800 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 z-40 flex justify-around items-center h-16 shadow-lg">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors text-xs font-medium ${
                isActive ? 'text-brand-700' : 'text-gray-500 hover:text-brand-600'
              }`
            }
          >
            <span className="text-xl">{item.label.split(' ')[0]}</span>
            <span>{item.label.split(' ').slice(1).join(' ')}</span>
          </NavLink>
        ))}
      </nav>

      {/* Desktop side nav */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 bg-white border-r border-gray-200 flex-col p-3 gap-1 z-30">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-800 border border-brand-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-brand-700'
              }`
            }
          >
            <span className="text-lg">{item.label.split(' ')[0]}</span>
            {item.label.split(' ').slice(1).join(' ')}
          </NavLink>
        ))}
        <div className="mt-auto text-xs text-gray-400 px-4 py-3">
          {user?.nombre}<br />
          <span className="text-brand-600 font-medium">{user?.rol}</span>
        </div>
      </aside>
    </div>
  );
}
