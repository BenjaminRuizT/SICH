import { useState, useEffect, useCallback } from 'react';
import api from '../../context/AuthContext';
import Modal from '../../components/Modal';

export default function Herramientas() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState('');
  const [plaza, setPlaza] = useState('');
  const [sinRev, setSinRev] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tipo) params.set('tipo', tipo);
      if (plaza) params.set('plaza', plaza);
      if (sinRev) params.set('sin_revision', '1');
      const r = await api.get(`/admin/herramientas?${params}`);
      setRows(r.data);
    } finally { setLoading(false); }
  }, [tipo, plaza, sinRev]);

  useEffect(() => { cargar(); }, [cargar]);

  const verDetalle = async (h) => {
    setSelected(h);
    setDetailLoading(true);
    try {
      const r = await api.get(`/admin/herramientas/${h.id}`);
      setDetail(r.data);
    } finally { setDetailLoading(false); }
  };

  const autos = rows.filter(r => r.tipo === 'auto');
  const equipos = rows.filter(r => r.tipo !== 'auto');
  const conRev = rows.filter(r => r.tiene_revision);
  const sinRevCount = rows.filter(r => !r.tiene_revision);

  return (
    <div className="md:ml-56 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Catálogo de herramientas</h1>
        <span className="text-sm text-gray-500">{rows.length} herramientas</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: rows.length, color: 'bg-gray-50 border-gray-200' },
          { label: 'Autos', value: autos.length, color: 'bg-blue-50 border-blue-200' },
          { label: 'Equipos', value: equipos.length, color: 'bg-purple-50 border-purple-200' },
          { label: 'Sin revisión', value: sinRevCount.length, color: 'bg-amber-50 border-amber-200' },
        ].map(s => (
          <div key={s.label} className={`card border ${s.color} text-center py-3`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="auto">Auto</option>
          <option value="laptop">Laptop</option>
          <option value="computo">Cómputo</option>
        </select>
        <input className="input" placeholder="Filtrar por plaza..." value={plaza}
          onChange={e => setPlaza(e.target.value)} />
        <label className="flex items-center gap-2 px-3 cursor-pointer">
          <input type="checkbox" checked={sinRev} onChange={e => setSinRev(e.target.checked)}
            className="w-4 h-4 accent-brand-600" />
          <span className="text-sm">Solo sin revisión</span>
        </label>
      </div>

      {loading && <p className="text-center text-gray-400 py-8">Cargando...</p>}

      <div className="space-y-2">
        {rows.map(h => (
          <div key={h.id} onClick={() => verDetalle(h)}
            className="card cursor-pointer hover:border-brand-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{h.tipo === 'auto' ? '🚗' : '💻'}</span>
                  <p className="font-semibold truncate">{h.marca} {h.modelo} {h.anio || ''}</p>
                </div>
                <p className="text-xs text-gray-500 ml-7">CB: {h.codigo_barras || '—'} · No. Activo: {h.no_activo || '—'}</p>
                <p className="text-xs text-gray-400 ml-7">{h.plaza || '—'}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${h.tiene_revision ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {h.tiene_revision ? '✓ Revisada' : 'Sin revisión'}
                </span>
                {h.empleado_nombre && (
                  <p className="text-xs text-gray-500 text-right max-w-[140px] truncate">{h.empleado_nombre}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-center text-gray-400 py-12">Sin herramientas</p>
        )}
      </div>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="Detalle de herramienta" maxWidth="max-w-xl">
        {detailLoading && <p className="text-center py-8 text-gray-400">Cargando...</p>}
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Tipo', detail.tipo],
                ['CB', detail.codigo_barras],
                ['No. Activo', detail.no_activo],
                ['Marca', detail.marca],
                ['Modelo', detail.modelo],
                ['Año', detail.anio],
                ['Serie', detail.serie],
                ['Plaza', detail.plaza],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-gray-400">{l}</p>
                  <p className="font-semibold">{v || '—'}</p>
                </div>
              ))}
            </div>

            <div className="card bg-gray-50">
              <p className="text-xs text-gray-400 mb-1">Asignado a</p>
              {detail.empleado_nombre
                ? <><p className="font-semibold">{detail.empleado_nombre}</p>
                    <p className="text-xs text-gray-500">#{detail.numero_empleado}</p></>
                : <p className="text-gray-500">{detail.asignado_a_raw || 'Sin asignar'}</p>
              }
            </div>

            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Historial de revisiones ({detail.revisiones?.length || 0})</p>
              {detail.revisiones?.length === 0
                ? <p className="text-gray-400 text-xs">Sin revisiones registradas</p>
                : (
                  <div className="space-y-1.5">
                    {detail.revisiones.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-semibold">{new Date(r.fecha_revision).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-500">Auditor: {r.auditor_nombre}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{r.tipo === 'auto' ? '🚗' : '💻'}</span>
                          <a href={r.tipo === 'auto' ? `/carta/auto/${r.id}` : `/carta/equipo/${r.id}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-brand-600 hover:underline"
                            onClick={e => e.stopPropagation()}>
                            Ver carta
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
