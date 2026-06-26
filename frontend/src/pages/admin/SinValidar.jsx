import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import api from '../../context/AuthContext';

const TIPO_LABEL = { auto: '🚗 Auto', laptop: '💻 Laptop', computo: '🖥 Cómputo' };

function exportExcel(rows) {
  const data = rows.map(i => ({
    'Tipo':            i.tipo,
    'Marca':           i.marca || '',
    'Modelo':          i.modelo || '',
    'Año':             i.anio || '',
    'No. Activo':      i.no_activo || '',
    'Código Barras':   i.codigo_barras || '',
    'Plaza':           i.plaza || '',
    'Empleado':        i.empleado_nombre || i.asignado_a_raw || '',
    'No. Empleado':    i.numero_empleado || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  // Ancho de columnas
  ws['!cols'] = [10, 14, 18, 8, 14, 16, 18, 32, 14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sin Validar');
  XLSX.writeFile(wb, `sin_validar_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function SinValidar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ tipo: '', plaza: '' });
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtro.tipo) params.set('tipo', filtro.tipo);
      if (filtro.plaza) params.set('plaza', filtro.plaza);
      const r = await api.get(`/admin/sin-validar?${params}`);
      setItems(r.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [filtro]);

  const plazas = [...new Set(items.map(i => i.plaza).filter(Boolean))].sort();

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => [
      i.marca, i.modelo, i.no_activo, i.codigo_barras,
      i.empleado_nombre, i.asignado_a_raw, i.numero_empleado, i.plaza,
    ].some(v => v && String(v).toLowerCase().includes(q)));
  }, [items, busqueda]);

  const totals = { auto: 0, laptop: 0, computo: 0 };
  filtrados.forEach(i => { if (totals[i.tipo] !== undefined) totals[i.tipo]++; });

  return (
    <div className="md:ml-56 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Herramientas sin validar</h1>
        <p className="text-xs text-gray-400 mt-0.5">Herramientas del MAF que aún no tienen revisión registrada</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(totals).map(([t, n]) => (
          <div key={t} className="card text-center py-3">
            <p className="text-2xl font-bold text-brand-700">{n}</p>
            <p className="text-xs text-gray-500">{TIPO_LABEL[t]}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative">
          <input
            className="input w-56 min-h-0 py-2 text-sm pr-8"
            placeholder="Buscar por nombre, no. activo, CB…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >✕</button>
          )}
        </div>
        <select className="input w-auto min-h-0 py-2 text-sm"
          value={filtro.tipo} onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}>
          <option value="">Todos los tipos</option>
          <option value="auto">Auto</option>
          <option value="laptop">Laptop</option>
          <option value="computo">Cómputo</option>
        </select>
        <select className="input w-auto min-h-0 py-2 text-sm"
          value={filtro.plaza} onChange={e => setFiltro(f => ({ ...f, plaza: e.target.value }))}>
          <option value="">Todas las plazas</option>
          {plazas.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-sm text-gray-500 self-center">{filtrados.length} registros</span>
        {filtrados.length > 0 && (
          <button
            onClick={() => exportExcel(filtrados)}
            className="ml-auto flex items-center gap-1.5 text-sm bg-brand-700 hover:bg-brand-800 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar Excel
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : filtrados.length === 0 && !busqueda && !filtro.tipo && !filtro.plaza ? (
        <div className="card text-center py-10">
          <p className="text-4xl mb-2">✅</p>
          <p className="font-semibold text-gray-700">¡Todas las herramientas han sido validadas!</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-400 text-sm">Sin resultados para la búsqueda actual.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(item => (
            <div key={item.id} className="card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full">
                    {TIPO_LABEL[item.tipo] || item.tipo}
                  </span>
                  {item.plaza && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.plaza}</span>
                  )}
                </div>
                <p className="font-semibold mt-1 text-sm">
                  {[item.marca, item.modelo].filter(Boolean).join(' ') || '(sin modelo)'}
                  {item.anio && <span className="text-gray-400 font-normal"> {item.anio}</span>}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.no_activo && <span>No. Activo: <b>{item.no_activo}</b> · </span>}
                  CB: {item.codigo_barras || '—'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {item.empleado_nombre ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 leading-tight">{item.empleado_nombre}</p>
                    <p className="text-xs text-gray-400">{item.numero_empleado}</p>
                  </div>
                ) : item.asignado_a_raw ? (
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">{item.asignado_a_raw}</p>
                    <p className="text-xs text-red-400">Sin vincular</p>
                  </div>
                ) : (
                  <span className="text-xs text-gray-300">Sin asignar</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
