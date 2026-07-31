import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TZ = 'America/Tijuana';
const fmt = (d) => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }) : '—';

const EVENT_LABELS = {
  login_success: { label: 'Inicio de sesión', color: 'bg-green-100 text-green-800' },
  login_failed:  { label: 'Intento fallido',  color: 'bg-red-100 text-red-800' },
  logout:        { label: 'Cierre de sesión', color: 'bg-gray-100 text-gray-700' },
  locked:        { label: 'Cuenta bloqueada', color: 'bg-orange-100 text-orange-800' },
};

function EventBadge({ event }) {
  const e = EVENT_LABELS[event] || { label: event, color: 'bg-blue-100 text-blue-800' };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${e.color}`}>{e.label}</span>;
}

function DateRange({ desde, hasta, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div>
        <label className="label text-xs">Desde</label>
        <input type="date" className="input text-sm py-1" value={desde}
          onChange={e => onChange('desde', e.target.value)} />
      </div>
      <div>
        <label className="label text-xs">Hasta</label>
        <input type="date" className="input text-sm py-1" value={hasta}
          onChange={e => onChange('hasta', e.target.value)} />
      </div>
    </div>
  );
}

function SessionesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ desde: '', hasta: '' });
  const [eventFilter, setEventFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 300 };
      if (filters.desde) params.desde = filters.desde;
      if (filters.hasta) params.hasta = filters.hasta + 'T23:59:59';
      const { data } = await axios.get('/api/admin/logs/sesiones', { params });
      setRows(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const filtered = eventFilter ? rows.filter(r => r.event === eventFilter) : rows;

  const stats = {
    total: rows.length,
    exitosos: rows.filter(r => r.event === 'login_success').length,
    fallidos: rows.filter(r => r.event === 'login_failed').length,
    cierres: rows.filter(r => r.event === 'logout').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <DateRange desde={filters.desde} hasta={filters.hasta} onChange={setFilter} />
        <div>
          <label className="label text-xs">Tipo de evento</label>
          <select className="input text-sm py-1" value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Eventos', value: stats.total, color: 'text-gray-700' },
          { label: 'Ingresos', value: stats.exitosos, color: 'text-green-700' },
          { label: 'Fallidos', value: stats.fallidos, color: 'text-red-700' },
          { label: 'Cierres', value: stats.cierres, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="card text-center py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Sin registros para los filtros seleccionados</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Fecha / Hora</th>
                <th className="px-3 py-2 text-left">Usuario</th>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Evento</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Dispositivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="px-3 py-2 font-medium">{r.username}</td>
                  <td className="px-3 py-2 text-gray-600">{r.nombre || '—'}</td>
                  <td className="px-3 py-2"><EventBadge event={r.event} /></td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.ip || '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-400 max-w-[200px] truncate" title={r.user_agent}>{r.user_agent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActividadTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ desde: '', hasta: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 300 };
      if (filters.desde) params.desde = filters.desde;
      if (filters.hasta) params.hasta = filters.hasta + 'T23:59:59';
      const { data } = await axios.get('/api/admin/logs/actividad', { params });
      setRows(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <DateRange desde={filters.desde} hasta={filters.hasta} onChange={setFilter} />

      {loading ? (
        <p className="text-center text-gray-400 py-8">Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Sin registros para los filtros seleccionados</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Creada</th>
                <th className="px-3 py-2 text-left">Folio</th>
                <th className="px-3 py-2 text-left">Auditor</th>
                <th className="px-3 py-2 text-left">Empleado</th>
                <th className="px-3 py-2 text-left">Plaza</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs font-bold text-brand-700">
                    {String(r.id).padStart(6, '0')}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.auditor_nombre}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-xs">{r.nombre_completo || '—'}</p>
                    <p className="text-xs text-gray-400">{r.numero_empleado || ''}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.plaza || '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.tiene_auto && <span className="inline-block bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-1">Auto</span>}
                    {r.tiene_equipo && <span className="inline-block bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Equipo</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'completada' ? 'bg-green-100 text-green-800' :
                      r.status === 'pendiente'  ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'sesiones',  label: '🔐 Historial de sesiones' },
  { id: 'actividad', label: '📝 Actividad de revisiones' },
];

export default function Logs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('sesiones');

  return (
    <div className="md:ml-56 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-gray-600 text-sm">← Admin</button>
        <h1 className="text-xl font-bold">Logs del sistema</h1>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-b-2 border-brand-700 text-brand-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {tab === 'sesiones'  && <SessionesTab />}
        {tab === 'actividad' && <ActividadTab />}
      </div>
    </div>
  );
}
