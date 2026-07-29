import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../context/AuthContext';
import Modal from '../components/Modal';

const VIEW_MODES = [
  { id: 'lista', label: 'Lista', icon: '☰' },
  { id: 'tabla', label: 'Tabla', icon: '⊞' },
  { id: 'cuadricula', label: 'Cuadricula', icon: '⊟' },
];

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
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('sich-historial-view') || 'lista');
  const [exportingAuto, setExportingAuto] = useState(false);
  const [exportingEquipo, setExportingEquipo] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [canExportResponsivas, setCanExportResponsivas] = useState(false);

  useEffect(() => {
    api.get('/admin/exportar-responsivas-roles').then(r => {
      const roles = (r.data.roles || 'admin').split(',').map(s => s.trim());
      setCanExportResponsivas(roles.includes(user?.rol));
    }).catch(() => {});
  }, [user]);

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

  const changeView = (id) => {
    setViewMode(id);
    localStorage.setItem('sich-historial-view', id);
  };

  const exportarExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const r = await api.get(`/exportar/revisiones?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SICHE_Revisiones_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert('Error al exportar Excel. Intenta de nuevo.'); }
  };

  const exportarResponsivasZip = async (tipo) => {
    const setter = tipo === 'auto' ? setExportingAuto : setExportingEquipo;
    setter(true); setExportMsg(null);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const r = await api.get(`/responsivas/${tipo}?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SICHE_Responsivas_${tipo === 'auto' ? 'Auto' : 'Equipo'}_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e.response?.status === 404
        ? 'Sin revisiones en el rango indicado.'
        : 'Error al generar el archivo. Intenta de nuevo.';
      setExportMsg(msg);
    } finally { setter(false); }
  };

  const verDetalle = async (id) => {
    const r = await api.get(`/revisiones/${id}`);
    setSelected(r.data);
  };

  const fmtFecha = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtFechaHora = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const BadgeAuto = () => <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🚗 Auto</span>;
  const BadgeEquipo = () => <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">💻 Equipo</span>;

  return (
    <div className="md:ml-56 space-y-4">
      {successBanner && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl font-medium">
          Revision guardada correctamente
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Historial de revisiones</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            {VIEW_MODES.map(m => (
              <button key={m.id} onClick={() => changeView(m.id)}
                title={m.label}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === m.id ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {m.icon}
              </button>
            ))}
          </div>
          {/* Export buttons */}
          {isAdmin && (
            <button onClick={exportarExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              📥 Excel
            </button>
          )}
          {canExportResponsivas && (
            <>
              <button onClick={() => exportarResponsivasZip('auto')} disabled={exportingAuto}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                {exportingAuto ? '...' : '🚗 ZIP Auto'}
              </button>
              <button onClick={() => exportarResponsivasZip('equipo')} disabled={exportingEquipo}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                {exportingEquipo ? '...' : '💻 ZIP Equipo'}
              </button>
            </>
          )}
        </div>
      </div>

      {exportMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-sm">
          {exportMsg}
        </div>
      )}

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

      {/* ── VISTA LISTA ─────────────────────────────────────────────────────── */}
      {!loading && viewMode === 'lista' && (
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
                  {r.tiene_auto && <BadgeAuto />}
                  {r.tiene_equipo && <BadgeEquipo />}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{fmtFechaHora(r.fecha_revision)}</span>
                <span>Auditor: {r.auditor_nombre}</span>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-center text-gray-400 py-12">Sin revisiones registradas</p>}
        </div>
      )}

      {/* ── VISTA TABLA ─────────────────────────────────────────────────────── */}
      {!loading && viewMode === 'tabla' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-brand-900 text-white">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Folio</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Empleado</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide hidden sm:table-cell">Plaza</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide hidden md:table-cell">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={r.id} onClick={() => verDetalle(r.id)}
                  className={`cursor-pointer hover:bg-brand-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-brand-700 font-bold">
                    SICH-{String(r.id).padStart(6, '0')}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtFecha(r.fecha_revision)}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900 truncate max-w-[160px]">{r.nombre_completo}</p>
                    <p className="text-xs text-gray-400">#{r.numero_empleado}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 hidden sm:table-cell">{r.plaza || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {r.tiene_auto && <BadgeAuto />}
                      {r.tiene_equipo && <BadgeEquipo />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.auditor_nombre}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Sin revisiones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VISTA CUADRÍCULA ────────────────────────────────────────────────── */}
      {!loading && viewMode === 'cuadricula' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map(r => (
            <div key={r.id} onClick={() => verDetalle(r.id)}
              className="card cursor-pointer hover:border-brand-300 hover:shadow-md transition-all space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[11px] font-bold text-brand-700">SICH-{String(r.id).padStart(6,'0')}</span>
                <div className="flex gap-1 shrink-0">
                  {r.tiene_auto && <BadgeAuto />}
                  {r.tiene_equipo && <BadgeEquipo />}
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{r.nombre_completo}</p>
                <p className="text-xs text-gray-500">#{r.numero_empleado}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">{r.plaza || '—'}</span>
                <span>{fmtFecha(r.fecha_revision)}</span>
              </div>
              <div className="text-xs text-gray-400 pt-0.5 border-t border-gray-100">
                Auditor: <span className="text-gray-600">{r.auditor_nombre}</span>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="sm:col-span-2 text-center text-gray-400 py-12">Sin revisiones registradas</p>}
        </div>
      )}

      {/* Paginación */}
      {total > 20 && (
        <div className="flex justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary px-6 py-2 text-sm">Anterior</button>
          <span className="text-sm text-gray-500 py-2">Pag {page} · {total} total</span>
          <button onClick={() => setPage(p => p+1)} disabled={page * 20 >= total} className="btn-secondary px-6 py-2 text-sm">Siguiente</button>
        </div>
      )}

      {/* Modal detalle */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle de revision" maxWidth="max-w-2xl">
        {selected && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Empleado</p>
              <p className="font-bold text-base">{selected.nombre_completo}</p>
              <p className="text-gray-500">#{selected.numero_empleado}</p>
              <p className="text-gray-500">{selected.empleado_snapshot?.posicion} · {selected.empleado_snapshot?.departamento} · {selected.empleado_snapshot?.plaza}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Revision</p>
              <p>{new Date(selected.fecha_revision).toLocaleString('es-MX')}</p>
              <p className="text-gray-500">Auditor: {selected.auditor_nombre}</p>
            </div>
            {selected.auto && (
              <div className="card bg-blue-50 border-blue-200 space-y-1">
                <p className="font-semibold text-blue-800">🚗 Automovil</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  {[
                    ['Placas', selected.auto.placas],
                    ['No. Serie', selected.auto.no_serie],
                    ['Modelo', selected.auto.no_modelo],
                    ['Kilometraje', selected.auto.kilometraje],
                    ['Poliza', selected.auto.poliza_seguro === true || selected.auto.poliza_seguro === 'true' ? 'Si' : selected.auto.poliza_seguro === false || selected.auto.poliza_seguro === 'false' ? 'No' : selected.auto.poliza_seguro || '—'],
                    ['Licencia', selected.auto.licencia === true || selected.auto.licencia === 'true' ? 'Si' : selected.auto.licencia === false || selected.auto.licencia === 'false' ? 'No' : selected.auto.licencia || '—'],
                    ['Llanta ref.', selected.auto.llanta_refaccion == null ? '—' : selected.auto.llanta_refaccion ? 'Si' : 'No'],
                    ['Gato/Cruceta', selected.auto.gato_cruceta == null ? '—' : selected.auto.gato_cruceta ? 'Si' : 'No'],
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
                <p className="font-semibold text-purple-800">💻 Equipo de computo</p>
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
