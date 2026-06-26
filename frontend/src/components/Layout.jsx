import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useInactivity from '../hooks/useInactivity';
import useVersionCheck from '../hooks/useVersionCheck';
import { APP_VERSION } from '../version';

const NAV_AUDITOR = [
  { to: '/', label: '🏠 Inicio', exact: true },
  { to: '/nueva', label: '➕ Nueva Revisión' },
  { to: '/historial', label: '📋 Historial' },
];
const NAV_ADMIN = [
  ...NAV_AUDITOR,
  { to: '/admin', label: '⚙️ Administración' },
];

const THEMES = [
  { id: 'teal',     label: 'Teal',        hex: '#0f766e' },
  { id: 'indigo',   label: 'Índigo',      hex: '#4338ca' },
  { id: 'slate',    label: 'Gris',        hex: '#334155' },
  { id: 'violet',   label: 'Violeta',     hex: '#6d28d9' },
  { id: 'rose',     label: 'Rosa',        hex: '#be123c' },
  { id: 'navy',     label: 'Azul Marina', hex: '#1e3a8a' },
  { id: 'forest',   label: 'Verde Bosque',hex: '#166534' },
  { id: 'burgundy', label: 'Burdeos',     hex: '#7f1d1d' },
  { id: 'ocean',    label: 'Océano',      hex: '#0c4a6e' },
  { id: 'espresso', label: 'Espresso',    hex: '#78350f' },
  { id: 'steel',    label: 'Acero',       hex: '#164e63' },
  { id: 'olive',    label: 'Verde Olivo', hex: '#3f6212' },
  { id: 'plum',     label: 'Ciruela',     hex: '#701a75' },
  { id: 'charcoal', label: 'Carbón',      hex: '#18181b' },
  { id: 'copper',   label: 'Cobre',       hex: '#7c2d12' },
];

function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => localStorage.getItem('sich-theme') || 'teal');
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

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.rol === 'admin';
  const nav = isAdmin ? NAV_ADMIN : NAV_AUDITOR;

  // Restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('sich-theme') || 'teal';
    if (saved !== 'teal') document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useInactivity(async () => { await logout(); navigate('/login'); });
  const updateAvailable = useVersionCheck();

  return (
    <div className="min-h-screen flex flex-col">
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
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight">SICH</span>
            <span className="hidden sm:inline text-brand-300 text-xs">v{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <span className="text-sm text-brand-200 hidden md:inline">{user?.nombre}</span>
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
