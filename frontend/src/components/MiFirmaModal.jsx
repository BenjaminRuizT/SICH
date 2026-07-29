import { useState, useEffect } from 'react';
import axios from 'axios';
import SignatureCanvas from './SignatureCanvas';
import { fixSignatureBg } from '../utils/signatureUtils';

export default function MiFirmaModal({ nombre, onClose }) {
  const [firmaActual, setFirmaActual] = useState(null);
  const [firmaNueva, setFirmaNueva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    axios.get('/api/usuarios/me/firma')
      .then(async r => {
        if (r.data.firma) {
          const fixed = await fixSignatureBg(r.data.firma);
          setFirmaActual(fixed);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!firmaNueva) return;
    setSaving(true); setMsg(null);
    try {
      await axios.put('/api/usuarios/me/firma', { firma: firmaNueva });
      setFirmaActual(firmaNueva);
      setFirmaNueva(null);
      setMsg({ type: 'ok', text: 'Firma guardada. Se usará automáticamente en las próximas revisiones.' });
    } catch { setMsg({ type: 'error', text: 'Error al guardar la firma.' }); }
    finally { setSaving(false); }
  };

  const deleteFirma = async () => {
    setDeleting(true); setMsg(null);
    try {
      await axios.delete('/api/usuarios/me/firma');
      setFirmaActual(null);
      setFirmaNueva(null);
      setMsg({ type: 'ok', text: 'Firma eliminada.' });
    } catch { setMsg({ type: 'error', text: 'Error al eliminar la firma.' }); }
    finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Mi firma</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        <p className="text-xs text-gray-500">
          Esta firma se cargará automáticamente como firma del auditor en cada nueva revisión. Puedes sobreescribirla en cualquier revisión si es necesario.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : (
          <>
            {firmaActual && !firmaNueva && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">Firma guardada</p>
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex items-center justify-between gap-3">
                  <img src={firmaActual} alt="Mi firma" className="h-16 object-contain flex-1" />
                  <button
                    onClick={deleteFirma}
                    disabled={deleting}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0 underline underline-offset-2"
                  >
                    {deleting ? '...' : 'Eliminar'}
                  </button>
                </div>
                <p className="text-xs text-gray-400">Dibuja abajo para reemplazarla.</p>
              </div>
            )}

            <SignatureCanvas
              label={firmaActual ? 'Nueva firma (reemplaza la actual)' : 'Dibuja tu firma *'}
              signerName={nombre}
              onSave={v => setFirmaNueva(v)}
            />

            {msg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {msg.text}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1">Cerrar</button>
              <button onClick={save} disabled={saving || !firmaNueva} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Guardar firma'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
