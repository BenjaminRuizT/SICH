import { useState, useEffect } from 'react';
import api from '../../context/AuthContext';

const TIPO_LABEL = { auto: '🚗 Auto', laptop: '💻 Laptop', computo: '🖥 Cómputo' };

export default function SinValidar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ tipo: '', plaza: '' });

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
  const totals = { auto: 0, laptop: 0, computo: 0 };
  items.forEach(i => { if (totals[i.tipo] !== undefined) totals[i.tipo]++; });

  return (
    <div className="md:ml-56 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Herramientas sin validar</h1>
        <p className="text-xs text-gray-400 mt-0.5">Herramientas del MAF que aún no tienen revisión registrada en SICH</p>
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
      <div className="flex gap-2 flex-wrap">
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
        <span className="text-sm text-gray-500 self-center">{items.length} registros</span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-4xl mb-2">✅</p>
          <p className="font-semibold text-gray-700">¡Todas las herramientas han sido validadas!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
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
