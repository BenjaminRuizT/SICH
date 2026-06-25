import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../version';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/20 mb-4">
            <span className="text-4xl">🔧</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SICHE</h1>
          <p className="text-brand-300 text-sm mt-1">Sistema Integral de Control de Herramienta</p>
        </div>

        <div className="card shadow-2xl">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Usuario</label>
              <input className="input" type="text" autoComplete="username" placeholder="Ingresa tu usuario"
                value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" autoComplete="current-password" placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
        <p className="text-center text-brand-400 text-xs mt-6">v{APP_VERSION} · OXXO Región Tijuana</p>
      </div>
    </div>
  );
}
