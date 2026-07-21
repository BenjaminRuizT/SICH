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
function blank(val) { return val || '________________________________'; }
function yesno(val) { return val === true || val === 'true' || val === 'Sí' ? 'Sí' : val === false || val === 'false' || val === 'No' ? 'No' : '—'; }

export default function CartaResponsivaAuto() {
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
      const origin = window.location.origin;
      const url = `${origin}/verificar/${id}?h=${h.slice(0, 16)}`;
      setQrSrc(await generateQR(url));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  if (!rev || !rev.auto) return <div className="min-h-screen flex items-center justify-center text-red-500">Carta no disponible</div>;

  const emp = rev.empleado_snapshot || {};
  const auto = rev.auto;
  const snap = auto.herramienta_snapshot || {};

  const marca = snap.marca || emp.marca || '';
  const modelo = auto.no_modelo || snap.modelo || '';
  const anio = snap.anio || '';
  const serie = auto.no_serie || snap.serie || '';
  const placas = auto.placas || '';
  const plaza = emp.plaza || '';
  const puesto = emp.posicion || '';
  const nombreEmp = emp.nombre_completo || rev.nombre_completo || '';
  const nombreAuditor = rev.auditor_nombre || '';
  const folio = fmtFolio(rev.id);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="print:hidden fixed top-0 right-0 z-50 flex gap-2 p-4">
        <button onClick={() => navigate(-1)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">← Volver</button>
        <button onClick={() => window.print()} className="bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">🖨 Imprimir / Guardar PDF</button>
      </div>

      <div className="max-w-3xl mx-auto print:max-w-none p-8 print:p-0 pt-20 print:pt-0">
        {/* PAGE 1 */}
        <div className="bg-white shadow-md print:shadow-none p-10 print:p-8 mb-8 print:mb-0 print:page-break-after-always">

          <table className="w-full border-collapse border border-gray-800 mb-6 text-xs">
            <tbody>
              <tr>
                <td rowSpan="3" className="border border-gray-800 px-3 py-2 w-32 text-center">
                  <img src="/femsa.png" alt="FEMSA Comercio" className="w-full max-h-16 object-contain mx-auto" />
                </td>
                <td className="border border-gray-800 text-center text-[10px] px-2 py-0.5" colSpan="2">FORMATO</td>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5">CÓDIGO: OYC</td>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5">FOLIO: {folio}</td>
              </tr>
              <tr>
                <td className="border border-gray-800 text-center font-black text-base px-3 py-1 text-red-700" colSpan="2" rowSpan="2">
                  CARTA COMPROMISO
                </td>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5" colSpan="2">REVISIÓN: 01 / 09/May/03</td>
              </tr>
              <tr>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5">ELABORADO: 09/May/03</td>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5">Hoja 1 de 2</td>
              </tr>
            </tbody>
          </table>

          <div className="text-xs leading-relaxed space-y-3 font-serif">
            <p>
              <strong>1.1</strong> Convenio de uso de herramienta de trabajo que celebran por una parte Cadena Comercial Oxxo a quien en lo sucesivo se le denominará "la empresa" y por la otra <u className="px-1">{nombreEmp}</u> con domicilio en <u className="px-1">{auto.domicilio || '                                    '}</u> C.P <u className="px-1">{auto.codigo_postal || '      '}</u>. a quien en lo sucesivo se denominará "el empleado" y manifiestan que celebran el presente al tenor de las siguientes
            </p>
            <p className="text-center font-bold tracking-widest">D E C L A R A C I O N E S</p>
            <p><strong>I.</strong> Declara que su representada es una sociedad mercantil establecida conforme a las leyes mexicanas, y que dentro de su objeto social, se establece la posibilidad de celebrar contratos y convenios.</p>
            <p><strong>II.</strong> Manifiesta que tiene celebrado contrato de trabajo con <strong><u>Cadena Comercial Oxxo, SA de CV</u></strong> y que en el cuerpo del mismo se compromete expresamente a prestar sus servicios personales a terceros y que tal es el caso que ha sido asignado a <u className="px-1">{blank(plaza)}</u> en el puesto de <u className="px-1">{blank(puesto)}</u> y que para realizar las labores inherentes a su contrato de trabajo es necesario contar con un automóvil como herramienta de trabajo.</p>
            <p><strong>III.</strong> Ambas partes manifiestan que celebran el presente convenio al tenor de las siguientes:</p>
            <p className="text-center font-bold tracking-widest">2&nbsp;&nbsp;&nbsp;C L A U S U L A S</p>
            <p>"La empresa" hace entrega de un automóvil <u className="px-1">{blank(marca)} {modelo}</u> modelo <u className="px-1">{blank(anio)}</u> con número de serie <u className="px-1">{blank(serie)}</u> mismo que deberá de ser utilizado única y exclusivamente en el cumplimiento de las labores inherentes al puesto de <u className="px-1">{blank(puesto)}</u> que la empresa le asigne a "el empleado" previa autorización del representante legal de la misma.</p>
            <ol className="space-y-2 list-decimal pl-5">
              <li>"La empresa" cubrirá los gastos que imponen las leyes y reglamentos tales como placas, tenencias, revisados y demás derechos o impuestos que procedan por la tenencia, uso o disfrute el automóvil. "El empleado" cubrirá todas las sanciones o multas que provengan de infracciones a reglamentos o leyes, lo mismo los gastos de grúa que se ocasionen.</li>
              <li>La empresa comprará por su cuenta un seguro de Cobertura Total. Los daños que reciba el vehículo o gastos que se deriven de algún accidente y no estén cubiertos por alguna póliza, serán pagados por la empresa, así como los deducibles normales.</li>
              <li>Los deducibles provenientes de accidentes en los que participe algún conductor que no tenga relación con la empresa y los daños que el seguro no cubra por falta de licencia del conductor, serán cubiertos de contado y cuando "la empresa" lo solicite a "el empleado" que tiene asignado el automóvil.</li>
            </ol>
          </div>

          <table className="w-full border-collapse border border-gray-800 mt-8 text-[10px]">
            <tbody>
              <tr className="bg-gray-100">
                <td className="border border-gray-800 px-2 py-1 font-bold text-center">AUTORIZACION</td>
                <td className="border border-gray-800 px-2 py-1 text-center" colSpan="2">OXXO | Uso Interno</td>
              </tr>
              <tr>
                <td className="border border-gray-800 px-2 py-1 font-bold text-center">RESPONSABLE</td>
                <td className="border border-gray-800 px-2 py-1 font-bold text-center">AUTORIZA</td>
                <td className="border border-gray-800 px-2 py-1 font-bold text-center">AUTORIZA</td>
              </tr>
              <tr>
                <td className="border border-gray-800 px-2 py-1 text-center">ORGANIZACIÓN Y COMPENSACIONES</td>
                <td className="border border-gray-800 px-2 py-1 text-center">DIRECTOR GENERAL</td>
                <td className="border border-gray-800 px-2 py-1 text-center">DIRECTOR RECURSOS HUMANOS</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PAGE 2 */}
        <div className="bg-white shadow-md print:shadow-none p-10 print:p-8">
          <table className="w-full border-collapse border border-gray-800 mb-6 text-xs">
            <tbody>
              <tr>
                <td rowSpan="3" className="border border-gray-800 px-3 py-2 w-32 text-center">
                  <img src="/femsa.png" alt="FEMSA Comercio" className="w-full max-h-16 object-contain mx-auto" />
                </td>
                <td className="border border-gray-800 text-center text-[10px] px-2 py-0.5" colSpan="2">FORMATO</td>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5">CÓDIGO: OYC</td>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5">FOLIO: {folio}</td>
              </tr>
              <tr>
                <td className="border border-gray-800 text-center font-black text-base px-3 py-1 text-red-700" colSpan="2" rowSpan="2">
                  CARTA COMPROMISO
                </td>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5" colSpan="2">REVISIÓN: 01 / 09/May/03</td>
              </tr>
              <tr>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5">ELABORADO: 09/May/03</td>
                <td className="border border-gray-800 text-[10px] px-2 py-0.5">Hoja 2 de 2</td>
              </tr>
            </tbody>
          </table>

          <div className="text-xs leading-relaxed font-serif">
            <ol start="4" className="space-y-2 list-decimal pl-5">
              <li>"El Empleado" se compromete a utilizar personalmente el automóvil que "la empresa" le hace entrega única y exclusivamente en las actividades inherentes al puesto de <u className="px-1">{blank(puesto)}</u> otras que la empresa le asigne, deberá de respetar siempre la imagen de "la empresa", y por ningún motivo podrá prestarlo, cederlo ó traspasarlo a otra persona sin previa autorización por escrito del representante legal de la misma.</li>
              <li>En periodo de vacaciones el automóvil invariablemente deberá permanecer en la empresa.</li>
              <li>"El empleado es responsable de la operación correcta del automóvil que le ha sido asignado, el incumplimiento de las condiciones pactadas son motivo de sanción y en caso de reincidir es motivo de rescisión de contrato individual de trabajo.</li>
              <li>"El empleado" se compromete a mantener el automóvil en perfectas condiciones, si el carro sufre cualquier siniestro, aun siendo este menor deberá ser reparado a la brevedad posible.</li>
              <li>"La empresa" se compromete a cubrir los gastos de operación y mantenimiento del automóvil conforme a las normas y criterios establecidos en el reglamento de automóviles vigentes en la misma.</li>
              <li>Se deberá establecer un programa de mantenimiento preventivo que asegure la operación cotidiana y alargue la vida útil de automóvil, será responsabilidad de "el empleado" que tiene asignado el automóvil el estado y conservación del mismo y sujetarse totalmente a lo que "la empresa" establezca.</li>
              <li>En caso de separarse "el empleado" del puesto que tenía asignado por cualquier motivo (promoción, renuncia, indemnización, etc.), Este deberá entregar el automóvil en perfectas condiciones de uso y operación a "la empresa" en la fecha de su separación.</li>
              <li>Manifiesta "el empleado" que el automóvil que le ha sido asignado es herramienta de trabajo y que no forma parte integrante de sus prestaciones, por lo que en este acto acepta que en ningún momento se deberá integrar a su salario.</li>
              <li className="font-semibold">Ambas partes firman el presente convenio de conformidad en la ciudad de <u className="px-1">{blank(plaza)}</u> a <u className="px-1">{fmt(rev.fecha_revision)}</u></li>
            </ol>

            {/* Datos del auto revisado */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded text-xs space-y-1">
              <p className="font-bold text-gray-700 mb-2">Datos de la unidad revisada:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span>Marca/Modelo: <strong>{marca} {modelo}</strong></span>
                <span>Año: <strong>{anio || '—'}</strong></span>
                <span>No. Serie: <strong>{serie || '—'}</strong></span>
                <span>Placas: <strong>{placas || '—'}</strong></span>
                <span>CB: <strong>{auto.codigo_barras || '—'}</strong></span>
                <span>Km: <strong>{auto.kilometraje || '—'}</strong></span>
                <span>Póliza de seguro: <strong>{yesno(auto.poliza_seguro)}</strong></span>
                <span>Licencia vigente: <strong>{yesno(auto.licencia)}</strong></span>
                <span>Llanta refacción: <strong>{yesno(auto.llanta_refaccion)}</strong></span>
                <span>Gato / Cruceta: <strong>{yesno(auto.gato_cruceta)}</strong></span>
                <span>Revisión: <strong>{fmtFull(rev.fecha_revision)}</strong></span>
              </div>
              {auto.comentarios && <p>Comentarios: <em>{auto.comentarios}</em></p>}
              {Array.isArray(auto.danos) && auto.danos.length > 0 && (
                <div>
                  <p className="font-semibold mt-1">Daños registrados:</p>
                  <ul className="list-disc pl-4">
                    {auto.danos.map((d, i) => (
                      <li key={i}>{d.label}{d.observacion ? `: ${d.observacion}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="mt-8 grid grid-cols-2 gap-8">
              <div className="text-center">
                {auto.firma_empleado
                  ? <img src={auto.firma_empleado} alt="Firma empleado" className="h-20 mx-auto border-b border-gray-400 mb-1 max-w-full" />
                  : <div className="h-20 border-b border-gray-400 mb-1" />
                }
                <p className="text-[11px] font-semibold">{nombreEmp}</p>
                <p className="text-[10px] text-gray-500">Nombre y Firma del Empleado</p>
              </div>
              <div className="text-center">
                {auto.firma_auditor
                  ? <img src={auto.firma_auditor} alt="Firma auditor" className="h-20 mx-auto border-b border-gray-400 mb-1 max-w-full" />
                  : <div className="h-20 border-b border-gray-400 mb-1" />
                }
                <p className="text-[11px] font-semibold">{nombreAuditor}</p>
                <p className="text-[10px] text-gray-500">RH de la Unidad de Negocio</p>
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
                <p className="mt-1">Este documento fue generado digitalmente mediante el Sistema de Control de Herramienta de Cadena Comercial OXXO. Las firmas electrónicas fueron capturadas al momento de la revisión y tienen plena validez conforme al Art. 1803 del Código Civil Federal y la Ley de Firma Electrónica Avanzada. Cualquier alteración invalida este documento. Verifique en el QR adjunto.</p>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse border border-gray-800 mt-6 text-[10px]">
            <tbody>
              <tr className="bg-gray-100">
                <td className="border border-gray-800 px-2 py-1 font-bold text-center">AUTORIZACION</td>
                <td className="border border-gray-800 px-2 py-1 text-center" colSpan="2">OXXO | Uso Interno</td>
              </tr>
              <tr>
                <td className="border border-gray-800 px-2 py-1 font-bold text-center">RESPONSABLE</td>
                <td className="border border-gray-800 px-2 py-1 font-bold text-center">AUTORIZA</td>
                <td className="border border-gray-800 px-2 py-1 font-bold text-center">AUTORIZA</td>
              </tr>
              <tr>
                <td className="border border-gray-800 px-2 py-1 text-center">ORGANIZACIÓN Y COMPENSACIONES</td>
                <td className="border border-gray-800 px-2 py-1 text-center">DIRECTOR GENERAL</td>
                <td className="border border-gray-800 px-2 py-1 text-center">DIRECTOR RECURSOS HUMANOS</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:page-break-after-always { page-break-after: always; }
        }
      `}</style>
    </div>
  );
}
