import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function fmtFull(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
}

export default function Verificar() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const h = params.get('h') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch(`/api/verificar/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setStatus('ok');
      })
      .catch(() => setStatus('error'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Verificando documento...</p>
    </div>
  );

  if (status === 'error' || data?.error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card max-w-sm text-center">
        <p className="text-4xl mb-4">❌</p>
        <h1 className="text-lg font-bold text-red-700">Documento no encontrado</h1>
        <p className="text-sm text-gray-500 mt-2">El folio consultado no existe en el sistema SICH.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full space-y-4">
        <div className="text-center">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-xl font-bold text-green-700">Documento auténtico</h1>
          <p className="text-sm text-gray-500 mt-1">Verificado en el Sistema SICH — Cadena Comercial OXXO</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-sm">
          <div><span className="text-gray-500">Folio:</span> <strong>SICH-{String(data.id).padStart(6,'0')}</strong></div>
          <div><span className="text-gray-500">Empleado:</span> <strong>{data.nombre_completo}</strong></div>
          <div><span className="text-gray-500">No. Empleado:</span> <strong>{data.numero_empleado}</strong></div>
          <div><span className="text-gray-500">Plaza:</span> <strong>{data.plaza || '—'}</strong></div>
          <div><span className="text-gray-500">Fecha de revisión:</span> <strong>{fmtFull(data.fecha_revision)}</strong></div>
          <div><span className="text-gray-500">Auditor:</span> <strong>{data.auditor_nombre}</strong></div>
          <div className="flex gap-2 mt-1">
            {data.tiene_auto && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🚗 Auto</span>}
            {data.tiene_equipo && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">💻 Equipo</span>}
          </div>
        </div>

        {h && (
          <div className="text-[10px] text-gray-400 font-mono break-all bg-gray-100 rounded p-2">
            Hash verificado: {h}...
          </div>
        )}

        <p className="text-[11px] text-gray-400 text-center">
          Este documento fue firmado digitalmente mediante SICH. Las firmas electrónicas tienen validez conforme al Art. 1803 del Código Civil Federal y la Ley de Firma Electrónica Avanzada.
        </p>
      </div>
    </div>
  );
}
