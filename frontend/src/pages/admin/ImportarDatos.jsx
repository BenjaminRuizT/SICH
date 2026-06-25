import { useState } from 'react';
import api from '../../context/AuthContext';

export default function ImportarDatos() {
  const [tab, setTab] = useState('empleados');
  const [json, setJson] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const importar = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = JSON.parse(json);
      const endpoint = tab === 'empleados' ? '/empleados/import' : '/herramientas/import';
      const payload = tab === 'empleados' ? { empleados: data } : { herramientas: data };
      const r = await api.post(endpoint, payload);
      setResult(r.data);
      setJson('');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="md:ml-56 space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">Importar datos</h1>
      <div className="flex gap-2">
        {['empleados','herramientas'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab===t ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'empleados' ? '👥 Empleados' : '🔧 Herramientas'}
          </button>
        ))}
      </div>
      <div className="card space-y-3">
        <p className="text-sm text-gray-600">
          {tab === 'empleados'
            ? 'Pega un array JSON con los empleados a importar. Campos: numero_empleado, nombre_completo, posicion, departamento, plaza.'
            : 'Pega un array JSON con las herramientas del MAF. Campos: tipo (auto/laptop/computo), codigo_barras, no_activo, marca, modelo, anio, serie, plaza, asignado_a_raw.'}
        </p>
        <textarea className="input min-h-[200px] font-mono text-xs resize-none" placeholder='[{"numero_empleado":"12345","nombre_completo":"Juan López",...}]'
          value={json} onChange={e => setJson(e.target.value)} />
        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {result && (
          <div className="bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm text-green-800">
            ✅ Importado: {JSON.stringify(result)}
          </div>
        )}
        <button onClick={importar} disabled={loading || !json.trim()} className="btn-primary">
          {loading ? 'Importando...' : 'Importar'}
        </button>
      </div>
    </div>
  );
}
