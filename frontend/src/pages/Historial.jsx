import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../context/AuthContext';
import Modal from '../components/Modal';

export default function Historial() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.rol === 'admin';
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(location.state?.success);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('empleado', search);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const r = await api.get(`/revisiones?${params}`);
      setRows(r.data.rows);
      setTotal(r.data.total);
    } finally { setLoading(false); }
  }, [page, search, desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (successBanner) setTimeout(() => setSuccessBanner(false), 4000); }, [successBanner]);

  const exportar = async () => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    window.open(`/api/exportar/revisiones?${params}`, '_blank');
  };

  const verDetalle = async (id) => {
    const r = await api.get(`/revisiones/${id}`);
    setSelected(r.data);
  };

  return (
    <div className="md:ml-56 space-y-4">
      {successBanner && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl font-medium">
          ✅ Revisión guardada correctamente
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Historial de revisiones</h1>
        {isAdmin && (
          <button onClick={exportar} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
            📥 Exportar Excel
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input className="input" placeholder="Buscar empleado..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <input className="input" type="date" placeholder="Desde" value={desde}
          onChange={e => { setDesde(e.target.value); setPage(1); }} />
        <input className="input" type="date" placeholder="Hasta" value={hasta}
          onChange={e => { setHasta(e.target.value); setPage(1); }} />
      </div>

      {loading && <p className="text-center text-gray-400 py-8">Cargando...</p>}

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} onClick={() => verDetalle(r.id)}
            className="card cursor-pointer hover:border-brand-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{r.nombre_completo}</p>
                <p className="text-xs text-gray-500">#{r.numero_empleado} · {r.plaza}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {r.tiene_auto && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🚗 Auto</span>}
                {r.tiene_equipo && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">💻 Equipo</span>}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>{new Date(r.fecha_revision).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
              <span>Auditor: {r.auditor_nombre}</span>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-center text-gray-400 py-12">Sin revisiones registradas</p>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary px-6 py-2 text-sm">Anterior</button>
          <span className="text-sm text-gray-500 py-2">Pág {page} · {total} total</span>
          <button onClick={() => setPage(p => p+1)} disabled={page * 20 >= total} className="btn-secondary px-6 py-2 text-sm">Siguiente</button>
        </div>
      )}

      {/* Modal detalle */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle de revisión" maxWidth="max-w-2xl">
        {selected && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Empleado</p>
              <p className="font-bold text-base">{selected.nombre_completo}</p>
              <p className="text-gray-500">#{selected.numero_empleado}</p>
              <p className="text-gray-500">{selected.empleado_snapshot?.posicion} · {selected.empleado_snapshot?.departamento} · {selected.empleado_snapshot?.plaza}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Revisión</p>
              <p>{new Date(selected.fecha_revision).toLocaleString('es-MX')}</p>
              <p className="text-gray-500">Auditor: {selected.auditor_nombre}</p>
            </div>
            {selected.auto && (
              <div className="card bg-blue-50 border-blue-200 space-y-1">
                <p className="font-semibold text-blue-800">🚗 Automóvil</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  {[
                    ['Placas', selected.auto.placas],
                    ['No. Serie', selected.auto.no_serie],
                    ['Modelo', selected.auto.no_modelo],
                    ['Kilometraje', selected.auto.kilometraje],
                    ['Póliza', selected.auto.poliza_seguro === true || selected.auto.poliza_seguro === 'true' ? 'Sí' : selected.auto.poliza_seguro === false || selected.auto.poliza_seguro === 'false' ? 'No' : selected.auto.poliza_seguro || '—'],
                    ['Licencia', selected.auto.licencia === true || selected.auto.licencia === 'true' ? 'Sí' : selected.auto.licencia === false || selected.auto.licencia === 'false' ? 'No' : selected.auto.licencia || '—'],
                    ['Llanta ref.', selected.auto.llanta_refaccion == null ? '—' : selected.auto.llanta_refaccion ? 'Sí' : 'No'],
                    ['Gato/Cruceta', selected.auto.gato_cruceta == null ? '—' : selected.auto.gato_cruceta ? 'Sí' : 'No'],
                  ].map(([l,v]) => (
                    <div key={l}><span className="text-gray-500">{l}:</span> <b>{v || '—'}</b></div>
                  ))}
                </div>
                {selected.auto.comentarios && <p className="text-xs text-gray-600 mt-1">Comentarios: {selected.auto.comentarios}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {selected.auto.foto_condiciones?.length > 0 && selected.auto.foto_condiciones.map((f, i) => (
                    <img key={i} src={f} alt="" className="h-16 w-16 object-cover rounded-lg border" />
                  ))}
                  {selected.auto.foto_licencia && <img src={selected.auto.foto_licencia} alt="Licencia frente" className="h-16 w-16 object-cover rounded-lg border" title="Licencia frente" />}
                  {selected.auto.foto_licencia_reverso && <img src={selected.auto.foto_licencia_reverso} alt="Licencia reverso" className="h-16 w-16 object-cover rounded-lg border" title="Licencia reverso" />}
                  {selected.auto.foto_tarjeta_circulacion && <img src={selected.auto.foto_tarjeta_circulacion} alt="Tarjeta circ." className="h-16 w-16 object-cover rounded-lg border" />}
                </div>
                {(selected.auto.firma_empleado || selected.auto.firma_auditor) && (
                  <div className="flex gap-3 mt-2">
                    {selected.auto.firma_empleado && (
                      <div className="text-center">
                        <img src={selected.auto.firma_empleado} alt="Firma empleado" className="h-12 border rounded bg-white" />
                        <p className="text-[10px] text-gray-400">Empleado</p>
                      </div>
                    )}
                    {selected.auto.firma_auditor && (
                      <div className="text-center">
                        <img src={selected.auto.firma_auditor} alt="Firma auditor" className="h-12 border rounded bg-white" />
                        <p className="text-[10px] text-gray-400">Auditor</p>
                      </div>
                    )}
                  </div>
                )}
                <a href={`/carta/auto/${selected.id}`} target="_blank" rel="noreferrer"
                  className="mt-2 inline-block text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  🖨 Ver Carta Compromiso
                </a>
              </div>
            )}
            {selected.equipo && (
              <div className="card bg-purple-50 border-purple-200 space-y-1">
                <p className="font-semibold text-purple-800">💻 Equipo de cómputo</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  {[['CB', selected.equipo.codigo_barras],['Marca', selected.equipo.marca],['Modelo', selected.equipo.modelo],['Serie', selected.equipo.serie]].map(([l,v]) => (
                    <div key={l}><span className="text-gray-500">{l}:</span> <b>{v || '—'}</b></div>
                  ))}
                </div>
                {selected.equipo.foto_equipo && <img src={selected.equipo.foto_equipo} alt="Equipo" className="h-24 w-24 object-cover rounded-lg border mt-2" />}
                {(selected.equipo.firma_empleado || selected.equipo.firma_auditor) && (
                  <div className="flex gap-3 mt-2">
                    {selected.equipo.firma_empleado && (
                      <div className="text-center">
                        <img src={selected.equipo.firma_empleado} alt="Firma empleado" className="h-12 border rounded bg-white" />
                        <p className="text-[10px] text-gray-400">Empleado</p>
                      </div>
                    )}
                    {selected.equipo.firma_auditor && (
                      <div className="text-center">
                        <img src={selected.equipo.firma_auditor} alt="Firma auditor" className="h-12 border rounded bg-white" />
                        <p className="text-[10px] text-gray-400">Auditor</p>
                      </div>
                    )}
                  </div>
                )}
                <a href={`/carta/equipo/${selected.id}`} target="_blank" rel="noreferrer"
                  className="mt-2 inline-block text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700">
                  🖨 Ver Carta Responsiva
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
