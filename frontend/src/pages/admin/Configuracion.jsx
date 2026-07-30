import { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../context/AuthContext';
import SignatureCanvas from '../../components/SignatureCanvas';
import { fixSignatureBg } from '../../utils/signatureUtils';

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function Configuracion() {
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [rhNombre, setRhNombre] = useState('');
  const [rhFirmaActual, setRhFirmaActual] = useState(null);
  const [rhFirmaNueva, setRhFirmaNueva] = useState(null);
  const [rhSaving, setRhSaving] = useState(false);
  const [rhMsg, setRhMsg] = useState(null);

  const [ciudad, setCiudad] = useState('');
  const [ciudadSaving, setCiudadSaving] = useState(false);
  const [ciudadMsg, setCiudadMsg] = useState(null);

  const [firmaOpcional, setFirmaOpcional] = useState(false);
  const [firmaOpcionalSaving, setFirmaOpcionalSaving] = useState(false);

  const [pendientes, setPendientes] = useState([]);
  const [pendientesLoading, setPendientesLoading] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [aplicarMsg, setAplicarMsg] = useState(null);

  const [confirmDeleteRH, setConfirmDeleteRH] = useState(false);
  const [deletingRH, setDeletingRH] = useState(false);

  const [exportUsers, setExportUsers] = useState([]);
  const [exportUsersLoading, setExportUsersLoading] = useState(false);
  const [savingExportUser, setSavingExportUser] = useState(null);
  const [savingReopenUser, setSavingReopenUser] = useState(null);

  const loadPendientes = () => {
    setPendientesLoading(true);
    axios.get('/api/admin/pendientes-firma-rh')
      .then(r => setPendientes(r.data))
      .catch(() => {})
      .finally(() => setPendientesLoading(false));
  };

  useEffect(() => {
    axios.get('/api/admin/config')
      .then(async r => {
        setMinutes(r.data.inactivity_minutes || '20');
        setCiudad(r.data.ciudad_revision || '');
        setRhNombre(r.data.nombre_responsable_rh || '');
        setFirmaOpcional(r.data.firma_rh_opcional === 'true');
        const rawFirma = r.data.firma_responsable_rh || null;
        if (rawFirma) {
          const fixedFirma = await fixSignatureBg(rawFirma);
          setRhFirmaActual(fixedFirma);
          if (fixedFirma !== rawFirma) {
            axios.put('/api/admin/config', { firma_responsable_rh: fixedFirma }).catch(() => {});
          }
        }
      })
      .catch(() => setMinutes('20'))
      .finally(() => setLoading(false));
    loadPendientes();
    setExportUsersLoading(true);
    axios.get('/api/usuarios').then(r => setExportUsers(r.data)).catch(() => {}).finally(() => setExportUsersLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const val = parseInt(minutes);
    if (isNaN(val) || val < 1 || val > 480) {
      setMsg({ type: 'error', text: 'Ingresa un valor entre 1 y 480 minutos.' });
      return;
    }
    setSaving(true); setMsg(null);
    try {
      await axios.put('/api/admin/config', { inactivity_minutes: val });
      setMsg({ type: 'ok', text: 'Configuración guardada. Se aplicará al recargar la sesión.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    } finally { setSaving(false); }
  };

  const saveCiudad = async (e) => {
    e.preventDefault();
    if (!ciudad.trim()) { setCiudadMsg({ type: 'error', text: 'Ingresa la ciudad.' }); return; }
    setCiudadSaving(true); setCiudadMsg(null);
    try {
      await axios.put('/api/admin/config', { ciudad_revision: ciudad.trim() });
      setCiudadMsg({ type: 'ok', text: 'Ciudad guardada. Aparecerá en las cartas responsivas.' });
    } catch (err) {
      setCiudadMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    } finally { setCiudadSaving(false); }
  };

  const saveRH = async (e) => {
    e.preventDefault();
    const firma = rhFirmaNueva || rhFirmaActual;
    if (!rhNombre.trim()) { setRhMsg({ type: 'error', text: 'El nombre del responsable es requerido.' }); return; }
    if (!firma) { setRhMsg({ type: 'error', text: 'La firma del responsable es requerida.' }); return; }
    setRhSaving(true); setRhMsg(null);
    try {
      await axios.put('/api/admin/config', { nombre_responsable_rh: rhNombre.trim(), firma_responsable_rh: firma });
      setRhFirmaActual(firma);
      setRhFirmaNueva(null);
      setRhMsg({ type: 'ok', text: 'Responsable de RH guardado.' });
      loadPendientes();
    } catch (err) {
      setRhMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    } finally { setRhSaving(false); }
  };

  const toggleFirmaOpcional = async (val) => {
    setFirmaOpcionalSaving(true);
    try {
      await axios.put('/api/admin/config', { firma_rh_opcional: val ? 'true' : 'false' });
      setFirmaOpcional(val);
    } catch {}
    finally { setFirmaOpcionalSaving(false); }
  };

  const deleteRH = async () => {
    setDeletingRH(true);
    try {
      await axios.delete('/api/admin/config/rh');
      setRhNombre('');
      setRhFirmaActual(null);
      setRhFirmaNueva(null);
      setRhMsg({ type: 'ok', text: 'Datos del Responsable de RH eliminados.' });
      setConfirmDeleteRH(false);
    } catch {
      setRhMsg({ type: 'error', text: 'Error al eliminar.' });
    } finally { setDeletingRH(false); }
  };

  const toggleExportUser = async (userId, current) => {
    setSavingExportUser(userId);
    const newVal = !current;
    try {
      await axios.patch(`/api/usuarios/${userId}`, { can_export_responsivas: newVal });
      setExportUsers(prev => prev.map(u => u.id === userId ? { ...u, can_export_responsivas: newVal } : u));
    } catch {}
    finally { setSavingExportUser(null); }
  };

  const toggleReopenUser = async (userId, current) => {
    setSavingReopenUser(userId);
    const newVal = !current;
    try {
      await axios.patch(`/api/usuarios/${userId}`, { can_reabrir_revision: newVal });
      setExportUsers(prev => prev.map(u => u.id === userId ? { ...u, can_reabrir_revision: newVal } : u));
    } catch {}
    finally { setSavingReopenUser(null); }
  };

  const aplicarFirma = async () => {
    setAplicando(true); setAplicarMsg(null);
    try {
      const { data } = await axios.post('/api/admin/aplicar-firma-rh');
      setAplicarMsg({ type: 'ok', text: `Firma aplicada a ${data.actualizados} documento(s). Las cartas responsivas ya están completas.` });
      loadPendientes();
    } catch (err) {
      setAplicarMsg({ type: 'error', text: err.response?.data?.error || 'Error al aplicar firma.' });
    } finally { setAplicando(false); }
  };

  if (loading) return <div className="md:ml-56 p-6 text-gray-400">Cargando...</div>;

  const rhConfigurado = !!(rhNombre && rhFirmaActual);

  return (
    <div className="md:ml-56 space-y-6 max-w-lg">
      <h1 className="text-xl font-bold">Configuración</h1>

      {/* Responsable de RH */}
      <div className={`card space-y-4 ${rhConfigurado ? 'border-green-200' : 'border-amber-300 border-2'}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Responsable de RH</h2>
          {rhConfigurado
            ? <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full font-semibold">✓ Configurado</span>
            : <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full font-semibold">⚠ Sin configurar</span>}
        </div>
        <p className="text-sm text-gray-500">
          El nombre y firma del Responsable de RH se imprimirán en todas las cartas responsivas.
        </p>

        <form onSubmit={saveRH} className="space-y-4">
          <div>
            <label className="label">Nombre del Responsable de RH<span className="text-red-500 ml-1">*</span></label>
            <input className="input" type="text" value={rhNombre}
              onChange={e => setRhNombre(e.target.value)} placeholder="Nombre completo..." />
          </div>

          {rhFirmaActual && !rhFirmaNueva && (
            <div>
              <p className="label mb-1">Firma actual guardada</p>
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex items-center gap-3">
                <img src={rhFirmaActual} alt="Firma RH" className="h-16 object-contain" />
                <p className="text-xs text-gray-500">Dibuja abajo para reemplazarla</p>
              </div>
            </div>
          )}

          <SignatureCanvas
            label={rhFirmaActual ? 'Nueva firma (reemplaza la actual)' : 'Firma del Responsable de RH *'}
            signerName={rhNombre}
            onSave={v => setRhFirmaNueva(v)}
          />

          {rhMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${rhMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {rhMsg.text}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={rhSaving} className="btn-primary px-6">
              {rhSaving ? 'Guardando...' : 'Guardar Responsable de RH'}
            </button>

            {rhConfigurado && !confirmDeleteRH && (
              <button type="button" onClick={() => setConfirmDeleteRH(true)}
                className="text-xs text-red-600 hover:text-red-800 underline underline-offset-2">
                Eliminar datos
              </button>
            )}
          </div>

          {confirmDeleteRH && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
              <p className="text-sm text-red-700 font-semibold">¿Eliminar nombre y firma del Responsable de RH?</p>
              <p className="text-xs text-red-600">Las auditorías futuras quedarán bloqueadas hasta volver a configurarlo (a menos que el modo opcional esté activo).</p>
              <div className="flex gap-2">
                <button type="button" onClick={deleteRH} disabled={deletingRH}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-semibold">
                  {deletingRH ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button type="button" onClick={() => setConfirmDeleteRH(false)}
                  className="text-xs bg-white border border-gray-300 px-4 py-1.5 rounded-lg text-gray-600">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Modo opcional — permitir sin firma RH */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Modo sin firma de RH</h2>
          <button
            type="button"
            disabled={firmaOpcionalSaving}
            onClick={() => toggleFirmaOpcional(!firmaOpcional)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              firmaOpcional ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              firmaOpcional ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {firmaOpcional
            ? <span className="text-amber-700 font-medium">Activo — se pueden registrar auditorías sin firma RH. Los documentos generados quedarán pendientes de firma.</span>
            : 'Inactivo — la firma del Responsable de RH es obligatoria para registrar auditorías.'}
        </p>
      </div>

      {/* Documentos pendientes de firma RH */}
      <div className={`card space-y-4 ${pendientes.length > 0 ? 'border-amber-300 border-2' : ''}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Documentos pendientes de firma RH</h2>
          {pendientes.length > 0
            ? <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-1 rounded-full">{pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}</span>
            : <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full font-semibold">✓ Sin pendientes</span>
          }
        </div>

        {pendientesLoading ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : pendientes.length > 0 ? (
          <>
            <p className="text-sm text-gray-500">
              Estas cartas responsivas fueron generadas sin firma del Responsable de RH. Al hacer clic en <strong>Aplicar firma</strong>, se usará la firma actual para completarlas todas.
            </p>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
              {pendientes.map(r => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2.5 bg-white text-xs gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-[#134e4a]">SICH-{String(r.id).padStart(6, '0')}</span>
                    <span className="text-gray-400 mx-1.5">·</span>
                    <span className="text-gray-700">{r.nombre_completo || '—'}</span>
                    {r.plaza && <span className="text-gray-400 ml-1">({r.plaza})</span>}
                  </div>
                  <div className="text-gray-400 text-right shrink-0">
                    <div>{fmt(r.fecha_revision)}</div>
                    <div>{r.auditor_nombre}</div>
                  </div>
                </div>
              ))}
            </div>

            {aplicarMsg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${aplicarMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {aplicarMsg.text}
              </p>
            )}

            <button
              type="button"
              onClick={aplicarFirma}
              disabled={aplicando || !rhConfigurado}
              className="btn-primary w-full"
            >
              {aplicando ? 'Aplicando...' : `Aplicar firma RH a ${pendientes.length} documento(s)`}
            </button>

            {!rhConfigurado && (
              <p className="text-xs text-amber-600">Configura primero el Responsable de RH para poder aplicar la firma.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No hay documentos pendientes de firma.</p>
        )}
      </div>

      {/* Ciudad de la revisión */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Ciudad de la revisión</h2>
        <p className="text-sm text-gray-500">
          Ciudad que aparecerá en las cartas responsivas (Ej. Tijuana, B.C. / Ensenada, B.C.).
        </p>
        <form onSubmit={saveCiudad} className="space-y-4">
          <div>
            <label className="label">Ciudad<span className="text-red-500 ml-1">*</span></label>
            <input className="input" type="text" value={ciudad}
              onChange={e => setCiudad(e.target.value)} placeholder="Ej. Tijuana, B.C." />
          </div>
          {ciudadMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${ciudadMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {ciudadMsg.text}
            </p>
          )}
          <button type="submit" disabled={ciudadSaving} className="btn-primary w-auto px-6">
            {ciudadSaving ? 'Guardando...' : 'Guardar ciudad'}
          </button>
        </form>
      </div>

      {/* Sesión por inactividad */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Sesión por inactividad</h2>
        <p className="text-sm text-gray-500">
          El sistema cerrará la sesión automáticamente tras este tiempo sin actividad del usuario.
        </p>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Minutos de inactividad</label>
            <div className="flex items-center gap-3">
              <input className="input w-32" type="number" min="1" max="480"
                value={minutes} onChange={e => setMinutes(e.target.value)} required />
              <span className="text-sm text-gray-500">minutos (mín. 1, máx. 480)</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[10, 15, 20, 30, 60].map(m => (
              <button key={m} type="button" onClick={() => setMinutes(String(m))}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  String(minutes) === String(m)
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                }`}>
                {m} min
              </button>
            ))}
          </div>

          {msg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {msg.text}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-auto px-6">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Acceso a exportar responsivas */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-700">Exportar responsivas (ZIP)</h2>
        <p className="text-sm text-gray-500">
          Selecciona qué usuarios pueden ver y usar los botones de descarga ZIP de responsivas en el Historial. Los administradores siempre tienen acceso.
        </p>
        {exportUsersLoading ? (
          <p className="text-sm text-gray-400">Cargando usuarios...</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {exportUsers.map(u => {
              const isAdmin = u.rol === 'admin';
              const active = isAdmin || u.can_export_responsivas;
              const isSaving = savingExportUser === u.id;
              return (
                <div key={u.id} className="flex items-center justify-between px-4 py-3 bg-white">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{u.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {u.username} · <span className={`font-semibold ${isAdmin ? 'text-brand-700' : 'text-gray-500'}`}>{isAdmin ? 'Admin' : 'Auditor'}</span>
                    </p>
                  </div>
                  {isAdmin ? (
                    <span className="text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full font-semibold shrink-0">
                      Siempre activo
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleExportUser(u.id, u.can_export_responsivas)}
                      title={active ? 'Quitar acceso' : 'Dar acceso'}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        active ? 'bg-brand-700' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        active ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  )}
                </div>
              );
            })}
            {exportUsers.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">Sin usuarios registrados.</p>
            )}
          </div>
        )}
      </div>

      {/* Permiso para editar registros */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-700">Corrección de registros</h2>
        <p className="text-sm text-gray-500">
          Usuarios autorizados para corregir datos capturados por error en revisiones ya cerradas (placas, serie, modelo, kilometraje, comentarios). Las firmas y fotos no se modifican. Los administradores siempre tienen este permiso.
        </p>
        {exportUsersLoading ? (
          <p className="text-sm text-gray-400">Cargando usuarios...</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {exportUsers.map(u => {
              const isAdmin = u.rol === 'admin';
              const active = isAdmin || u.can_reabrir_revision;
              const isSaving = savingReopenUser === u.id;
              return (
                <div key={u.id} className="flex items-center justify-between px-4 py-3 bg-white">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{u.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {u.username} · <span className={`font-semibold ${isAdmin ? 'text-brand-700' : 'text-gray-500'}`}>{isAdmin ? 'Admin' : 'Auditor'}</span>
                    </p>
                  </div>
                  {isAdmin ? (
                    <span className="text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full font-semibold shrink-0">
                      Siempre activo
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleReopenUser(u.id, u.can_reabrir_revision)}
                      title={active ? 'Quitar permiso de corrección' : 'Dar permiso de corrección'}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        active ? 'bg-brand-700' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        active ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  )}
                </div>
              );
            })}
            {exportUsers.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">Sin usuarios registrados.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
