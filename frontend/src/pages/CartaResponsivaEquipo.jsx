import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../context/AuthContext';
import { generateDocHash, generateQR, fmtFolio } from '../utils/docSecurity';

function fmtFull(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
}
function fmtDate(date) {
  if (!date) return '___________________';
  return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CartaResponsivaEquipo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rev, setRev] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hash, setHash] = useState('');
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    api.get(`/revisiones/${id}`).then(async r => {
      setRev(r.data);
      const h = await generateDocHash(r.data);
      setHash(h);
      const url = `${window.location.origin}/verificar/${id}?h=${h.slice(0, 16)}`;
      setQrSrc(await generateQR(url));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  if (!rev || !rev.equipo) return <div className="min-h-screen flex items-center justify-center text-red-500">Carta no disponible</div>;

  const emp = rev.empleado_snapshot || {};
  const eq = rev.equipo;
  const snap = eq.herramienta_snapshot || {};

  const plaza = emp.plaza || '';
  const ciudad = plaza || 'Tijuana';
  const nombreEmp = emp.nombre_completo || rev.nombre_completo || '';
  const puesto = emp.posicion || '';
  const marca = eq.marca || snap.marca || '';
  const modelo = eq.modelo || snap.modelo || '';
  const descripcion = [marca, modelo].filter(Boolean).join(' ');
  const noActivo = snap.no_activo || eq.codigo_barras || '—';
  const serie = eq.serie || snap.serie || '—';
  const nombreRH = eq.nombre_responsable_rh || rev.auditor_nombre || '';
  const folio = fmtFolio(rev.id);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="print:hidden fixed top-0 right-0 z-50 flex gap-2 p-4">
        <button onClick={() => navigate(-1)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">← Volver</button>
        <button onClick={() => window.print()} className="bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">🖨 Imprimir / Guardar PDF</button>
      </div>

      <div className="max-w-2xl mx-auto print:max-w-none p-8 print:p-0 pt-20 print:pt-0">
        <div className="bg-white shadow-md print:shadow-none p-12 print:p-10 min-h-screen print:min-h-0">

          {/* Header: logo OXXO + PLAZA */}
          <div className="flex items-start justify-between mb-10">
            <img src="/logo.png" alt="OXXO" className="h-16 w-16 object-contain" />
            <p className="text-lg font-black tracking-wide">
              PLAZA <u className="px-2 min-w-[120px] inline-block">{plaza || '_______________'}</u>
            </p>
          </div>

          {/* Fecha */}
          <p className="text-sm mb-10">
            <u className="px-1 min-w-[160px] inline-block">{ciudad}</u>
            {', a '}
            <u className="px-1 min-w-[140px] inline-block">{fmtDate(rev.fecha_revision)}</u>
          </p>

          {/* Cuerpo */}
          <p className="text-sm leading-relaxed mb-10">
            Hago entrega para uso laboral{' '}
            <strong>
              de Computadora de escritorio{' '}
              <u className="px-1">{descripcion || '___________________________'}</u>
            </strong>
            , para el buen uso y al servicio de la Compañía{' '}
            <strong>CADENA COMERCIAL OXXO, S.A. DE C. V.</strong>
          </p>

          {/* Datos del activo */}
          <div className="space-y-3 mb-10 text-sm">
            <p>
              <strong>NUMERO DE ACTIVO:</strong>{' '}
              <u className="px-2 min-w-[180px] inline-block">{noActivo}</u>
            </p>
            <p>
              <strong>NÚMERO DE SERIE:</strong>{' '}
              <u className="px-2 min-w-[180px] inline-block">{serie}</u>
            </p>
          </div>

          {/* Daños y comentarios — sección adicional si existen */}
          {Array.isArray(eq.danos) && eq.danos.length > 0 && (
            <div className="mb-8 p-3 border border-gray-400 rounded text-xs">
              <p className="font-semibold mb-1">Daños o desperfectos registrados:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {eq.danos.map((d, i) => (
                  <li key={i}>{d.label}{d.observacion ? `: ${d.observacion}` : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {eq.comentarios && (
            <p className="text-xs mb-8 text-gray-600">Comentarios: <em>{eq.comentarios}</em></p>
          )}

          {/* Firmas: ENTREGA | RECIBE */}
          <div className="grid grid-cols-2 gap-12 mb-10">
            {/* ENTREGA — Gerente Regional RH */}
            <div className="text-center">
              <p className="text-sm font-bold mb-8">ENTREGA</p>
              {eq.firma_responsable_rh
                ? <img src={eq.firma_responsable_rh} alt="Firma RH" className="h-20 mx-auto border-b-2 border-gray-800 mb-1 max-w-full object-contain" />
                : <div className="h-20 border-b-2 border-gray-800 mb-1" />
              }
              <p className="text-sm font-bold">GERENTE REGIONAL RH</p>
              {nombreRH && <p className="text-xs text-gray-600 mt-0.5">{nombreRH}</p>}
            </div>

            {/* RECIBE — empleado */}
            <div className="text-center">
              <p className="text-sm font-bold mb-8">RECIBE</p>
              {eq.firma_empleado
                ? <img src={eq.firma_empleado} alt="Firma empleado" className="h-20 mx-auto border-b-2 border-gray-800 mb-1 max-w-full object-contain" />
                : <div className="h-20 border-b-2 border-gray-800 mb-1" />
              }
              <p className="text-xs"><strong>Nombre:</strong> {nombreEmp}</p>
              <p className="text-xs"><strong>Puesto:</strong> {puesto || '—'}</p>
            </div>
          </div>

          {/* TESTIGO */}
          <div className="text-center mb-10">
            <p className="text-sm font-bold mb-8">TESTIGO</p>
            <div className="h-16 border-b-2 border-gray-800 mb-1 max-w-[200px] mx-auto" />
            <p className="text-sm font-bold">GTE JR. ADMINISTRATIVO</p>
          </div>

          {/* Pie de seguridad */}
          <div className="mt-8 pt-4 border-t border-gray-300 flex items-start gap-4">
            {qrSrc && <img src={qrSrc} alt="QR verificación" className="w-16 h-16 shrink-0" />}
            <div className="text-[8px] text-gray-500 space-y-0.5 flex-1">
              <p className="font-semibold text-gray-700">Validez y autenticidad del documento</p>
              <p>Folio: <strong>{folio}</strong> · Generado: {fmtFull(rev.fecha_revision)}</p>
              <p>Responsable RH: {nombreRH}</p>
              <p className="font-mono break-all">SHA-256: {hash.slice(0, 32)}...</p>
              <p className="mt-1">Documento generado digitalmente por el Sistema de Control de Herramienta — Cadena Comercial OXXO. Firmas electrónicas con validez conforme al Art. 1803 CCF. Verifique autenticidad en el QR adjunto.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { body { margin: 0; } }`}</style>
    </div>
  );
}
