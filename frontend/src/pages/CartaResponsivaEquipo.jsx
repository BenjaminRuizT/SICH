import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../context/AuthContext';
import { generateDocHash, generateQR, fmtFolio } from '../utils/docSecurity';

function fmt(date) {
  if (!date) return '___________________';
  return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtFull(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
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

  const ciudad = emp.plaza || 'Tijuana';
  const nombreEmp = emp.nombre_completo || rev.nombre_completo || '';
  const nombreAuditor = rev.auditor_nombre || '';
  const plaza = emp.plaza || '';
  const modelo = eq.modelo || snap.modelo || '—';
  const tipo = snap.tipo || 'Laptop';
  const serie = eq.serie || snap.serie || '—';
  const cb = eq.codigo_barras || snap.codigo_barras || '—';
  const marca = eq.marca || snap.marca || '';
  const folio = fmtFolio(rev.id);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="print:hidden fixed top-0 right-0 z-50 flex gap-2 p-4">
        <button onClick={() => navigate(-1)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">← Volver</button>
        <button onClick={() => window.print()} className="bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">🖨 Imprimir / Guardar PDF</button>
      </div>

      <div className="max-w-3xl mx-auto print:max-w-none p-8 print:p-0 pt-20 print:pt-0">
        <div className="bg-white shadow-md print:shadow-none p-10 print:p-12">

          <p className="text-sm mb-2 text-right text-gray-500 text-[10px]">Folio: <strong>{folio}</strong></p>
          <p className="text-sm mb-6">{ciudad}, {emp.region || 'Baja California'} a {fmt(rev.fecha_revision)}</p>

          <h1 className="text-base font-black text-center uppercase tracking-wide mb-6 border-y border-gray-800 py-2">
            RESPONSIVA PARA DISPOSITIVOS MÓVILES DE TIENDAS OXXO
          </h1>

          <div className="text-sm leading-relaxed space-y-4 font-serif">
            <p>
              A través de esta carta declara cadena comercial Oxxo a <strong><u>{nombreEmp}</u></strong> ser el único responsable de los dispositivos móviles que se le proporcionan por parte de Cadena Comercial Oxxo para el uso exclusivo en el ejercicio de sus funciones y bajo solicitud autorizada.
            </p>
            <p>
              Del mismo modo acepta la responsabilidad de dar buen uso, mantenerlos en condiciones óptimas y bajo resguardo para un buen desempeño. En caso contrario se compromete a aceptar las sanciones correspondientes que el reglamento interno de Cadena Comercial OXXO establece, así como realizar el pago por daños directos e indirectos ocasionados por mal uso.
            </p>
            <p>Se anexa la relación de equipos que se entregan.</p>
          </div>

          <table className="w-full border-collapse border border-gray-800 mt-6 mb-6 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-3 py-2 text-left">Marca</th>
                <th className="border border-gray-800 px-3 py-2 text-left">Modelo</th>
                <th className="border border-gray-800 px-3 py-2 text-left">Tipo</th>
                <th className="border border-gray-800 px-3 py-2 text-left">No. Serie</th>
                <th className="border border-gray-800 px-3 py-2 text-left">Código de Barras</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-800 px-3 py-2">{marca}</td>
                <td className="border border-gray-800 px-3 py-2">{modelo}</td>
                <td className="border border-gray-800 px-3 py-2 capitalize">{tipo}</td>
                <td className="border border-gray-800 px-3 py-2">{serie}</td>
                <td className="border border-gray-800 px-3 py-2">{cb}</td>
              </tr>
            </tbody>
          </table>

          {Array.isArray(eq.danos) && eq.danos.length > 0 && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-300 rounded text-sm">
              <p className="font-semibold mb-1">Daños o desperfectos registrados:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {eq.danos.map((d, i) => (
                  <li key={i}>{d.label}{d.observacion ? `: ${d.observacion}` : ''}</li>
                ))}
              </ul>
            </div>
          )}

          {eq.comentarios && <p className="text-sm mb-6">Comentarios: <em>{eq.comentarios}</em></p>}

          <p className="text-sm mb-8">Cadena Comercial Oxxo, Plaza <strong>{plaza || '___________________'}</strong>.</p>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mt-8">
            <div className="text-center">
              {eq.firma_empleado
                ? <img src={eq.firma_empleado} alt="Firma empleado" className="h-24 mx-auto border-b-2 border-gray-800 mb-2 max-w-full" />
                : <div className="h-24 border-b-2 border-gray-800 mb-2" />
              }
              <p className="text-sm font-semibold">{nombreEmp}</p>
              <p className="text-xs text-gray-500">Nombre y firma del empleado</p>
            </div>
            <div className="text-center">
              {eq.firma_auditor
                ? <img src={eq.firma_auditor} alt="Firma auditor" className="h-24 mx-auto border-b-2 border-gray-800 mb-2 max-w-full" />
                : <div className="h-24 border-b-2 border-gray-800 mb-2" />
              }
              <p className="text-sm font-semibold">{nombreAuditor}</p>
              <p className="text-xs text-gray-500">Nombre y firma ATI</p>
            </div>
          </div>

          {/* Security footer */}
          <div className="mt-6 pt-4 border-t border-gray-300 flex items-start gap-4">
            {qrSrc && <img src={qrSrc} alt="QR verificación" className="w-20 h-20 shrink-0" />}
            <div className="text-[9px] text-gray-500 space-y-0.5 flex-1">
              <p className="font-semibold text-gray-700">Validez y autenticidad del documento</p>
              <p>Folio: <strong>{folio}</strong> · Generado: {fmtFull(rev.fecha_revision)}</p>
              <p>Auditor: {nombreAuditor}</p>
              <p className="font-mono break-all">SHA-256: {hash.slice(0, 32)}...</p>
              <p className="mt-1">Este documento fue generado digitalmente mediante el Sistema SICH de Cadena Comercial OXXO. Las firmas electrónicas fueron capturadas al momento de la revisión y tienen plena validez conforme al Art. 1803 del Código Civil Federal y la Ley de Firma Electrónica Avanzada. Cualquier alteración invalida este documento. Verifique en el QR adjunto.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { body { margin: 0; } }`}</style>
    </div>
  );
}
