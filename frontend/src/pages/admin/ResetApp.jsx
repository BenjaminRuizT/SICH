import { useState } from 'react';
import api from '../../context/AuthContext';

export default function ResetApp() {
  const [opts, setOpts] = useState({ keep_historial: false, keep_herramientas: false, keep_empleados: false });
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const toggle = (k) => setOpts(o => ({ ...o, [k]: !o[k] }));

  const reset = async () => {
    if (confirm !== 'RESETEAR') { setError('Escribe RESETEAR para confirmar'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/admin/reset', opts);
      setResult(r.data.remaining);
      setConfirm('');
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const borrar = {
    historial: !opts.keep_historial,
    herramientas: !opts.keep_herramientas,
    empleados: !opts.keep_empleados && !opts.keep_herramientas,
  };

  return (
    <div className="md:ml-56 space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-red-700">Resetear aplicación</h1>
        <p className="text-xs text-gray-500 mt-0.5">Borra datos de la base de datos de forma permanente e irreversible.</p>
      </div>

      <div className="card border-red-100 space-y-4">
        <p className="text-sm font-semibold text-gray-700">¿Qué deseas conservar?</p>
        <div className="space-y-3">
          {[
            { key: 'keep_historial',    label: 'Conservar historial de revisiones', icon: '📋' },
            { key: 'keep_herramientas', label: 'Conservar herramientas (MAF)',       icon: '🔧' },
            { key: 'keep_empleados',    label: 'Conservar empleados',               icon: '👥' },
          ].map(({ key, label, icon }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={opts[key]} onChange={() => toggle(key)}
                className="w-5 h-5 rounded accent-brand-700" />
              <span className="text-sm">{icon} {label}</span>
            </label>
          ))}
        </div>

        {/* Preview de lo que se borrará */}
        <div className="bg-red-50 rounded-xl px-4 py-3 text-sm space-y-1">
          <p className="font-semibold text-red-800 text-xs uppercase tracking-wide mb-2">Se eliminará:</p>
          {borrar.historial && <p className="text-red-700">• Todas las revisiones y sus fotos/firmas</p>}
          {borrar.herramientas && <p className="text-red-700">• Todas las herramientas del catálogo</p>}
          {borrar.empleados && <p className="text-red-700">• Todos los empleados del catálogo</p>}
          {!borrar.historial && !borrar.herramientas && !borrar.empleados && (
            <p className="text-gray-500 italic">Nada (todo conservado)</p>
          )}
        </div>

        {/* Confirmación */}
        <div>
          <label className="label text-red-700">Escribe <strong>RESETEAR</strong> para confirmar</label>
          <input className="input border-red-300 focus:border-red-500 focus:ring-red-200"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="RESETEAR" />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {result ? (
          <div className="bg-green-50 border border-green-200 px-3 py-3 rounded-lg text-sm">
            <p className="font-semibold text-green-800 mb-1">✅ Reset completado</p>
            <p className="text-green-700">Revisiones restantes: <b>{result.revisiones}</b></p>
            <p className="text-green-700">Herramientas restantes: <b>{result.herramientas}</b></p>
            <p className="text-green-700">Empleados restantes: <b>{result.empleados}</b></p>
          </div>
        ) : (
          <button onClick={reset} disabled={loading || !confirm}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50">
            {loading ? 'Reseteando...' : '🗑 Ejecutar reset'}
          </button>
        )}
      </div>
    </div>
  );
}
