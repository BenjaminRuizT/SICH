import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Configuracion() {
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    axios.get('/api/admin/config')
      .then(r => { setMinutes(r.data.inactivity_minutes || '20'); })
      .catch(() => setMinutes('20'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const val = parseInt(minutes);
    if (isNaN(val) || val < 1 || val > 480) {
      setMsg({ type: 'error', text: 'Ingresa un valor entre 1 y 480 minutos.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await axios.put('/api/admin/config', { inactivity_minutes: val });
      setMsg({ type: 'ok', text: 'Configuración guardada. Se aplicará al recargar la sesión.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="md:ml-56 p-6 text-gray-400">Cargando...</div>;

  return (
    <div className="md:ml-56 space-y-6 max-w-lg">
      <h1 className="text-xl font-bold">Configuración</h1>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Sesión por inactividad</h2>
        <p className="text-sm text-gray-500">
          El sistema cerrará la sesión automáticamente tras este tiempo sin actividad del usuario.
        </p>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Minutos de inactividad</label>
            <div className="flex items-center gap-3">
              <input
                className="input w-32"
                type="number"
                min="1"
                max="480"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                required
              />
              <span className="text-sm text-gray-500">minutos (mín. 1, máx. 480)</span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 flex-wrap">
            {[10, 15, 20, 30, 60].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(String(m))}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  String(minutes) === String(m)
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>

          {msg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${
              msg.type === 'ok'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {msg.text}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-auto px-6">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
