import { useState, useEffect } from 'react';
import axios from 'axios';
import SignatureCanvas from '../../components/SignatureCanvas';

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

  useEffect(() => {
    axios.get('/api/admin/config')
      .then(r => {
        setMinutes(r.data.inactivity_minutes || '20');
        setRhNombre(r.data.nombre_responsable_rh || '');
        setRhFirmaActual(r.data.firma_responsable_rh || null);
      })
      .catch(() => setMinutes('20'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const val = parseInt(minutes);
    if (isNaN(val) || val < 1 || val > 480) {
      setMsg({ type: 'error', text: 'Ingresa un valor entre 1 y 480 minutos.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await axios.put('/api/admin/config', { inactivity_minutes: val });
      setMsg({ type: 'ok', text: 'Configuración guardada. Se aplicará al recargar la sesión.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    } finally { setSaving(false); }
  };

  const saveRH = async (e) => {
    e.preventDefault();
    const firma = rhFirmaNueva || rhFirmaActual;
    if (!rhNombre.trim()) { setRhMsg({ type: 'error', text: 'El nombre del responsable es requerido.' }); return; }
    if (!firma) { setRhMsg({ type: 'error', text: 'La firma del responsable es requerida.' }); return; }
    setRhSaving(true);
    setRhMsg(null);
    try {
      await axios.put('/api/admin/config', { nombre_responsable_rh: rhNombre.trim(), firma_responsable_rh: firma });
      setRhFirmaActual(firma);
      setRhFirmaNueva(null);
      setRhMsg({ type: 'ok', text: 'Responsable de RH guardado. Las nuevas auditorías usarán estos datos.' });
    } catch (err) {
      setRhMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    } finally { setRhSaving(false); }
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
            : <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full font-semibold">⚠ Requerido</span>}
        </div>
        <p className="text-sm text-gray-500">
          El nombre y firma del Responsable de RH se imprimirán en todas las cartas responsivas.
          Es obligatorio para poder realizar auditorías.
        </p>

        <form onSubmit={saveRH} className="space-y-4">
          <div>
            <label className="label">Nombre del Responsable de RH<span className="text-red-500 ml-1">*</span></label>
            <input
              className="input"
              type="text"
              value={rhNombre}
              onChange={e => setRhNombre(e.target.value)}
              placeholder="Nombre completo..."
            />
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

          <button type="submit" disabled={rhSaving} className="btn-primary w-auto px-6">
            {rhSaving ? 'Guardando...' : 'Guardar Responsable de RH'}
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
              <input
                className="input w-32"
                type="number"
                min="1"
                max="480"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                required
              />
              <span className="text-sm text-gray-500">minutos (mín. 1, máx. 480)</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[10, 15, 20, 30, 60].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(String(m))}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  String(minutes) === String(m)
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>

          {msg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${
              msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {msg.text}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-auto px-6">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
