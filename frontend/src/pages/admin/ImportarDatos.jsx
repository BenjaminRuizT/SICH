import { useState, useRef } from 'react';
import api from '../../context/AuthContext';

const TABS = ['empleados', 'herramientas'];

export default function ImportarDatos() {
  const [tab, setTab] = useState('empleados');
  const [mode, setMode] = useState('excel'); // 'excel' | 'json'
  const [json, setJson] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const resetState = () => { setJson(''); setResult(null); setError(''); };

  const cargarArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    if (isExcel && mode === 'excel') {
      reader.onload = (ev) => {
        const b64 = btoa(String.fromCharCode(...new Uint8Array(ev.target.result)));
        setJson(b64);
        setResult(null);
        setError('');
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (ev) => { setJson(ev.target.result); setResult(null); setError(''); };
      reader.readAsText(file, 'utf-8');
    }
  };

  const downloadTemplate = async () => {
    const r = await api.get(`/admin/template/${tab}`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${tab}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importar = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      if (mode === 'excel') {
        const r = await api.post(`/admin/import-excel/${tab}`, { data: json });
        setResult(r.data);
        setJson('');
      } else {
        const data = JSON.parse(json);
        if (!Array.isArray(data)) throw new Error('El JSON debe ser un array []');
        const endpoint = tab === 'empleados' ? '/empleados/import' : '/herramientas/import';
        const payload = tab === 'empleados' ? { empleados: data } : { herramientas: data };
        const r = await api.post(endpoint, payload);
        setResult(r.data);
        setJson('');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  const desc = tab === 'empleados'
    ? 'Columnas requeridas: numero_empleado, nombre_completo. Opcionales: posicion, departamento, plaza, region.'
    : 'Columnas requeridas: tipo (auto/laptop/computo), codigo_barras o no_activo. Opcionales: marca, modelo, anio, serie, plaza, asignado_a_raw, numero_empleado_asignado.';

  const accept = mode === 'excel' ? '.xlsx,.xls' : '.json';
  const hasData = !!json.trim();

  return (
    <div className="md:ml-56 space-y-4 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Importar datos</h1>
          <p className="text-xs text-gray-400 mt-0.5">Carga empleados y herramientas desde Excel o JSON</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-semibold transition-colors">
          ⬇ Template {tab}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); resetState(); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab===t ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'empleados' ? '👥 Empleados' : '🔧 Herramientas'}
          </button>
        ))}
      </div>

      <div className="card space-y-3">
        {/* Mode toggle */}
        <div className="flex gap-2 text-sm">
          {['excel','json'].map(m => (
            <button key={m} onClick={() => { setMode(m); resetState(); }}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${mode===m ? 'bg-brand-100 text-brand-800' : 'text-gray-500 hover:bg-gray-100'}`}>
              {m === 'excel' ? '📊 Excel (.xlsx)' : '{ } JSON'}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500">{desc}</p>

        {/* File picker */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => { fileRef.current.value = ''; fileRef.current?.click(); }}
            className="btn-secondary text-sm py-1.5 px-3 w-auto min-h-0">
            📂 Cargar archivo
          </button>
          <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={cargarArchivo} />
          {hasData && mode === 'excel' && (
            <span className="text-xs text-green-600 font-medium">✓ Archivo cargado</span>
          )}
          {hasData && mode === 'json' && (
            <span className="text-xs text-green-600 font-medium">
              ✓ {(() => { try { return JSON.parse(json).length + ' registros'; } catch { return 'datos cargados'; } })()}
            </span>
          )}
        </div>

        {mode === 'json' && (
          <div className="relative">
            <textarea
              className="input min-h-[140px] font-mono text-xs resize-none"
              placeholder={`[{"numero_empleado":"12345","nombre_completo":"Juan López",...}]`}
              value={json}
              onChange={e => { setJson(e.target.value); setResult(null); setError(''); }}
            />
            {json && (
              <button onClick={() => setJson('')}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs">✕</button>
            )}
          </div>
        )}

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {result && (
          <div className="bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm text-green-800 space-y-0.5">
            <p className="font-semibold">✅ Importación exitosa</p>
            {result.inserted !== undefined && <p>Insertados: {result.inserted} · Actualizados: {result.updated}</p>}
            {result.count !== undefined && <p>Procesados: {result.count}</p>}
            {result.total !== undefined && <p>Total en archivo: {result.total}</p>}
          </div>
        )}

        <button onClick={importar} disabled={loading || !hasData} className="btn-primary">
          {loading ? 'Importando...' : `Importar ${tab}`}
        </button>
      </div>
    </div>
  );
}
