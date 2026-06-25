import { useState, useRef } from 'react';
import api from '../../context/AuthContext';

export default function ImportarDatos() {
  const [tab, setTab] = useState('empleados');
  const [json, setJson] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const cargarArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJson(ev.target.result);
      setResult(null);
      setError('');
    };
    reader.readAsText(file, 'utf-8');
  };

  const importar = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) throw new Error('El JSON debe ser un array []');
      const endpoint = tab === 'empleados' ? '/empleados/import' : '/herramientas/import';
      const payload = tab === 'empleados' ? { empleados: data } : { herramientas: data };
      const r = await api.post(endpoint, payload);
      setResult(r.data);
      setJson('');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  const desc = tab === 'empleados'
    ? 'Campos requeridos: numero_empleado, nombre_completo. Opcionales: posicion, departamento, plaza, region.'
    : 'Campos requeridos: tipo (auto/laptop/computo), codigo_barras o no_activo. Opcionales: marca, modelo, anio, serie, plaza, asignado_a_raw.';

  return (
    <div className="md:ml-56 space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Importar datos</h1>
        <p className="text-xs text-gray-400 mt-0.5">Genera los archivos con <code className="bg-gray-100 px-1 rounded">python scripts/importar.py</code></p>
      </div>

      <div className="flex gap-2">
        {['empleados','herramientas'].map(t => (
          <button key={t} onClick={() => { setTab(t); setJson(''); setResult(null); setError(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab===t ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'empleados' ? '👥 Empleados' : '🔧 Herramientas'}
          </button>
        ))}
      </div>

      <div className="card space-y-3">
        <p className="text-xs text-gray-500">{desc}</p>

        {/* File upload */}
        <div className="flex items-center gap-3">
          <button onClick={() => fileRef.current?.click()}
            className="btn-secondary text-sm py-1.5 px-3">
            📂 Cargar archivo JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={cargarArchivo} />
          {json && (
            <span className="text-xs text-green-600 font-medium">
              ✓ {JSON.parse(json).length} registros cargados
            </span>
          )}
        </div>

        <div className="relative">
          <textarea
            className="input min-h-[160px] font-mono text-xs resize-none"
            placeholder={`Pega JSON o usa el botón para cargar archivo...\n[{"numero_empleado":"12345","nombre_completo":"Juan López",...}]`}
            value={json}
            onChange={e => { setJson(e.target.value); setResult(null); setError(''); }}
          />
          {json && (
            <button onClick={() => setJson('')}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs">✕</button>
          )}
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {result && (
          <div className="bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm text-green-800">
            ✅ {result.count ?? JSON.stringify(result)}
          </div>
        )}

        <button onClick={importar} disabled={loading || !json.trim()} className="btn-primary">
          {loading ? 'Importando...' : `Importar ${tab}`}
        </button>
      </div>
    </div>
  );
}
