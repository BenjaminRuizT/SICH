import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useInactivity from '../hooks/useInactivity';
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

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.rol === 'admin';
  const nav = isAdmin ? NAV_ADMIN : NAV_AUDITOR;

  useInactivity(async () => { await logout(); navigate('/login'); });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-brand-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight">SICH</span>
            <span className="hidden sm:inline text-brand-300 text-xs">v{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-3">
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

      {/* Bottom nav (mobile/tablet) */}
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
