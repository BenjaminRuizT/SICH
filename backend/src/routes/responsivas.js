const crypto = require('crypto');
const router = require('express').Router();
const PDFDocument = require('pdfkit');
const puppeteer = require('puppeteer-core');
const archiver = require('archiver');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { decrypt, decryptArr } = require('../utils/crypto');

function requireExportAccess(req, res, next) {
  requireAuth(req, res, async () => {
    if (req.user.rol === 'admin') return next();
    try {
      const { rows: [u] } = await pool.query('SELECT can_export_responsivas FROM app_users WHERE id=$1', [req.user.id]);
      if (u?.can_export_responsivas === true) return next();
      return res.status(403).json({ error: 'Sin acceso para exportar responsivas' });
    } catch { return res.status(500).json({ error: 'Error interno del servidor' }); }
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TZ = 'America/Tijuana';

function fmtDate(d) {
  if (!d) return '___________________';
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
}

function fmtFull(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ });
}

function boolStr(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (v === true || v === 'true' || v === 1 || v === '1') return 'Si';
  return 'No';
}

function dec(val) {
  if (!val) return null;
  return decrypt(String(val));
}

function addSig(doc, dataUrl, x, y, w, h) {
  if (!dataUrl) return;
  try {
    const b64 = dataUrl.replace(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    doc.image(buf, x, y, { fit: [w, h], align: 'center', valign: 'center' });
  } catch {}
}

function folio(id) {
  return 'SICH-' + String(id).padStart(6, '0');
}

function safeFilename(name) {
  return (name || 'Empleado').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_').slice(0, 60);
}

function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  try {
    // Robust: find the comma that separates data URL header from data
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx < 0) return null;
    const header = dataUrl.slice(0, commaIdx);
    if (!header.startsWith('data:') || !header.includes('base64')) return null;
    const b64 = dataUrl.slice(commaIdx + 1);
    if (!b64) return null;
    return Buffer.from(b64, 'base64');
  } catch { return null; }
}

let oxxoLogoBuffer = null;
let femsaLogoBuffer = null;
try {
  const p = path.join(__dirname, '../../frontend/public/oxxo.png');
  if (fs.existsSync(p)) oxxoLogoBuffer = fs.readFileSync(p);
} catch {}
try {
  const p = path.join(__dirname, '../../frontend/public/femsa.png');
  if (fs.existsSync(p)) femsaLogoBuffer = fs.readFileSync(p);
} catch {}

const femsaLogoDataUrl = femsaLogoBuffer ? `data:image/png;base64,${femsaLogoBuffer.toString('base64')}` : '';
const oxxoLogoDataUrl  = oxxoLogoBuffer  ? `data:image/png;base64,${oxxoLogoBuffer.toString('base64')}`  : '';

// ── HTML carta builders (idénticos al render React — el usuario abre y Ctrl+P) ─

function buildAutoHTML(rev, rawAuto) {
  const emp  = (rev.empleado_snapshot && typeof rev.empleado_snapshot === 'object') ? rev.empleado_snapshot : {};
  const snap = (rawAuto.herramienta_snapshot && typeof rawAuto.herramienta_snapshot === 'object') ? rawAuto.herramienta_snapshot : {};

  const marca      = snap.marca       || '';
  const modelo     = rawAuto.no_modelo || snap.modelo || '';
  const anio       = snap.anio        || '';
  const serie      = rawAuto.no_serie  || snap.serie  || '';
  const placas     = rawAuto.placas   || '';
  const plaza      = emp.plaza        || '';
  const puesto     = emp.posicion     || '';
  const nombreEmp  = emp.nombre_completo || '';
  const fol        = folio(rev.id);
  const fecha      = fmtDate(rev.fecha_revision);
  const danos      = Array.isArray(rawAuto.danos) ? rawAuto.danos : [];
  const firmaEmp   = dec(rawAuto.firma_empleado);
  const firmaRH    = dec(rawAuto.firma_responsable_rh);
  const b = v => v || '________________________________';
  const yn = v => (v === true || v === 'true' || v === 'Sí') ? 'Sí' : (v === false || v === 'false' || v === 'No') ? 'No' : '—';

  const logoTag = femsaLogoDataUrl
    ? `<img src="${femsaLogoDataUrl}" alt="FEMSA" style="max-width:100%;max-height:60px;object-fit:contain">`
    : '<strong style="color:#b91c1c;font-size:13px">FEMSA Comercio</strong>';

  const headerTable = (hoja) => `
  <table style="border-collapse:collapse;width:100%;font-size:10px;margin-bottom:16px">
    <tr>
      <td rowspan="3" style="border:1px solid #111;width:120px;text-align:center;padding:4px">${logoTag}</td>
      <td colspan="2" style="border:1px solid #111;text-align:center;padding:2px 4px">FORMATO</td>
      <td style="border:1px solid #111;padding:2px 4px">CÓDIGO: OYC</td>
      <td style="border:1px solid #111;padding:2px 4px">FOLIO: ${fol}</td>
    </tr>
    <tr>
      <td colspan="2" rowspan="2" style="border:1px solid #111;text-align:center;font-weight:900;font-size:16px;color:#b91c1c;padding:4px">CARTA COMPROMISO</td>
      <td colspan="2" style="border:1px solid #111;padding:2px 4px">REVISIÓN: 01. ELABORADO: 09/May/03</td>
    </tr>
    <tr>
      <td style="border:1px solid #111;padding:2px 4px">Fecha de auditoría: ${fecha}</td>
      <td style="border:1px solid #111;padding:2px 4px">Hoja ${hoja} de 2</td>
    </tr>
  </table>`;

  const authTable = () => `
  <table style="border-collapse:collapse;width:100%;font-size:10px;margin-top:20px">
    <tr>
      <td style="border:1px solid #111;background:#e5e7eb;font-weight:bold;text-align:center;padding:3px">AUTORIZACION</td>
      <td colspan="2" style="border:1px solid #111;text-align:center;padding:3px">OXXO | Uso Interno</td>
    </tr>
    <tr>
      <td style="border:1px solid #111;font-weight:bold;text-align:center;padding:3px">RESPONSABLE</td>
      <td style="border:1px solid #111;font-weight:bold;text-align:center;padding:3px">AUTORIZA</td>
      <td style="border:1px solid #111;font-weight:bold;text-align:center;padding:3px">AUTORIZA</td>
    </tr>
    <tr>
      <td style="border:1px solid #111;text-align:center;padding:3px;height:20px">ORGANIZACIÓN Y COMPENSACIONES</td>
      <td style="border:1px solid #111;text-align:center;padding:3px">DIRECTOR GENERAL</td>
      <td style="border:1px solid #111;text-align:center;padding:3px">DIRECTOR RECURSOS HUMANOS</td>
    </tr>
  </table>`;

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Carta Compromiso - ${fol}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,"Times New Roman",serif;font-size:12px;color:#000;background:#f3f4f6}
.page{width:210mm;max-width:100%;margin:10mm auto;padding:18mm 18mm;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.text{font-size:11px;line-height:1.65}
.text p{margin-bottom:6px}
.section-title{text-align:center;font-weight:bold;letter-spacing:.15em;margin:8px 0}
ol{padding-left:20px}
ol li{margin-bottom:5px}
u{text-decoration:underline;padding:0 2px}
.data-box{margin:12px 0;padding:10px;border:1px solid #d1d5db;background:#f9fafb;font-size:11px}
.data-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin-top:4px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px;text-align:center}
.sig-img{height:64px;max-width:100%;border-bottom:1px solid #666;display:block;margin:0 auto;object-fit:contain}
.sig-line{height:64px;border-bottom:1px solid #666;margin:0 auto;width:100%}
.sig-name{font-size:11px;font-weight:bold;margin-top:4px}
.sig-label{font-size:10px;color:#555;margin-top:2px}
.footer{margin-top:20px;padding-top:10px;border-top:1px solid #d1d5db;font-size:8px;color:#6b7280}
.btn{position:fixed;top:10px;right:10px;background:#1e3a8a;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;z-index:999}
@page{margin-top:12mm}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;padding:12mm 14mm}.page-break{page-break-after:always}.btn{display:none}}
</style>
</head>
<body>
<button class="btn" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},600);});</script>

<div class="page page-break">
  ${headerTable('1')}
  <div class="text">
    <p><strong>1.1</strong> Convenio de uso de herramienta de trabajo que celebran por una parte Cadena Comercial Oxxo a quien en lo sucesivo se le denominará "la empresa" y por la otra <u>${nombreEmp}</u> con domicilio en <u>${rawAuto.domicilio || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</u> C.P <u>${rawAuto.codigo_postal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</u>. a quien en lo sucesivo se denominará "el empleado" y manifiestan que celebran el presente al tenor de las siguientes</p>
    <p class="section-title">D E C L A R A C I O N E S</p>
    <p><strong>I.</strong> Declara que su representada es una sociedad mercantil establecida conforme a las leyes mexicanas, y que dentro de su objeto social, se establece la posibilidad de celebrar contratos y convenios.</p>
    <p><strong>II.</strong> Manifiesta que tiene celebrado contrato de trabajo con <strong><u>Cadena Comercial Oxxo, SA de CV</u></strong> y que en el cuerpo del mismo se compromete expresamente a prestar sus servicios personales a terceros y que tal es el caso que ha sido asignado a <u>${b(plaza)}</u> en el puesto de <u>${b(puesto)}</u> y que para realizar las labores inherentes a su contrato de trabajo es necesario contar con un automóvil como herramienta de trabajo.</p>
    <p><strong>III.</strong> Ambas partes manifiestan que celebran el presente convenio al tenor de las siguientes:</p>
    <p class="section-title">2&nbsp;&nbsp;&nbsp;C L A U S U L A S</p>
    <p>"La empresa" hace entrega de un automóvil <u>${b(marca)} ${modelo}</u> modelo <u>${b(anio)}</u> con número de serie <u>${b(serie)}</u> mismo que deberá de ser utilizado única y exclusivamente en el cumplimiento de las labores inherentes al puesto de <u>${b(puesto)}</u> que la empresa le asigne a "el empleado" previa autorización del representante legal de la misma.</p>
    <ol style="margin-top:8px">
      <li>"La empresa" cubrirá los gastos que imponen las leyes y reglamentos tales como placas, tenencias, revisados y demás derechos o impuestos que procedan por la tenencia, uso o disfrute el automóvil. "El empleado" cubrirá todas las sanciones o multas que provengan de infracciones a reglamentos o leyes, lo mismo los gastos de grúa que se ocasionen.</li>
      <li>La empresa comprará por su cuenta un seguro de Cobertura Total. Los daños que reciba el vehículo o gastos que se deriven de algún accidente y no estén cubiertos por alguna póliza, serán pagados por la empresa, así como los deducibles normales.</li>
      <li>Los deducibles provenientes de accidentes en los que participe algún conductor que no tenga relación con la empresa y los daños que el seguro no cubra por falta de licencia del conductor, serán cubiertos de contado y cuando "la empresa" lo solicite a "el empleado" que tiene asignado el automóvil.</li>
    </ol>
  </div>
  ${authTable()}
</div>

<div class="page">
  ${headerTable('2')}
  <div class="text">
    <ol start="4">
      <li>"El Empleado" se compromete a utilizar personalmente el automóvil que "la empresa" le hace entrega única y exclusivamente en las actividades inherentes al puesto de <u>${b(puesto)}</u> otras que la empresa le asigne, deberá de respetar siempre la imagen de "la empresa", y por ningún motivo podrá prestarlo, cederlo ó traspasarlo a otra persona sin previa autorización por escrito del representante legal de la misma.</li>
      <li>En periodo de vacaciones el automóvil invariablemente deberá permanecer en la empresa.</li>
      <li>"El empleado es responsable de la operación correcta del automóvil que le ha sido asignado, el incumplimiento de las condiciones pactadas son motivo de sanción y en caso de reincidir es motivo de rescisión de contrato individual de trabajo.</li>
      <li>"El empleado" se compromete a mantener el automóvil en perfectas condiciones, si el carro sufre cualquier siniestro, aun siendo este menor deberá ser reparado a la brevedad posible.</li>
      <li>"La empresa" se compromete a cubrir los gastos de operación y mantenimiento del automóvil conforme a las normas y criterios establecidos en el reglamento de automóviles vigentes en la misma.</li>
      <li>Se deberá establecer un programa de mantenimiento preventivo que asegure la operación cotidiana y alargue la vida útil de automóvil, será responsabilidad de "el empleado" que tiene asignado el automóvil el estado y conservación del mismo y sujetarse totalmente a lo que "la empresa" establezca.</li>
      <li>En caso de separarse "el empleado" del puesto que tenía asignado por cualquier motivo (promoción, renuncia, indemnización, etc.), Este deberá entregar el automóvil en perfectas condiciones de uso y operación a "la empresa" en la fecha de su separación.</li>
      <li>Manifiesta "el empleado" que el automóvil que le ha sido asignado es herramienta de trabajo y que no forma parte integrante de sus prestaciones, por lo que en este acto acepta que en ningún momento se deberá integrar a su salario.</li>
      <li><strong>Ambas partes firman el presente convenio de conformidad en la ciudad de <u>${b(plaza)}</u> a <u>${fecha}</u></strong></li>
    </ol>

    <div class="data-box">
      <strong>Datos de la unidad revisada:</strong>
      <div class="data-grid">
        <span>Marca/Modelo: <strong>${marca} ${modelo}</strong></span>
        <span>Año: <strong>${anio || '—'}</strong></span>
        <span>No. Serie: <strong>${serie || '—'}</strong></span>
        <span>Placas: <strong>${placas || '—'}</strong></span>
        <span>CB: <strong>${rawAuto.codigo_barras || '—'}</strong></span>
        <span>Km: <strong>${rawAuto.kilometraje || '—'}</strong></span>
        <span>Póliza de seguro: <strong>${yn(rawAuto.poliza_seguro)}</strong></span>
        <span>Licencia vigente: <strong>${yn(rawAuto.licencia_numero)}</strong></span>
        <span>Llanta refacción: <strong>${yn(rawAuto.llanta_refaccion)}</strong></span>
        <span>Gato / Cruceta: <strong>${yn(rawAuto.gato_cruceta)}</strong></span>
      </div>
      ${rawAuto.comentarios ? `<p style="margin-top:4px">Comentarios: <em>${rawAuto.comentarios}</em></p>` : ''}
      ${danos.length > 0 ? `<div style="margin-top:6px"><strong>Daños:</strong><ul style="padding-left:16px">${danos.map(d => `<li>${d.label || ''}${d.observacion ? ': ' + d.observacion : ''}</li>`).join('')}</ul></div>` : ''}
    </div>

    <div class="sigs">
      <div>
        ${firmaEmp ? `<img class="sig-img" src="${firmaEmp}" alt="Firma empleado">` : '<div class="sig-line"></div>'}
        <p class="sig-name">${nombreEmp}</p>
        <p class="sig-label">Nombre y Firma del Empleado</p>
      </div>
      <div>
        ${firmaRH ? `<img class="sig-img" src="${firmaRH}" alt="Firma RH">` : '<div class="sig-line"></div>'}
        ${rawAuto.nombre_responsable_rh ? `<p class="sig-name">${rawAuto.nombre_responsable_rh}</p>` : ''}
        <p class="sig-label">RH de la Unidad de Negocio</p>
      </div>
    </div>

    <div class="footer">
      <p><strong>Validez y autenticidad del documento</strong></p>
      <p>Folio: <strong>${fol}</strong> · Generado: ${fmtFull(rev.fecha_revision)}</p>
      <p>Auditor: ${rev.auditor_nombre || '—'}</p>
      <p style="margin-top:4px">Este documento fue generado digitalmente mediante el Sistema de Control de Herramienta de Cadena Comercial OXXO. Las firmas electrónicas fueron capturadas al momento de la revisión y tienen plena validez conforme al Art. 1803 del Código Civil Federal y la Ley de Firma Electrónica Avanzada. Cualquier alteración invalida este documento.</p>
    </div>
  </div>
  ${authTable()}
</div>
</body></html>`;
}

function buildEquipoHTML(rev, rawEquipo, ciudad) {
  const emp  = (rev.empleado_snapshot && typeof rev.empleado_snapshot === 'object') ? rev.empleado_snapshot : {};
  const snap = (rawEquipo.herramienta_snapshot && typeof rawEquipo.herramienta_snapshot === 'object') ? rawEquipo.herramienta_snapshot : {};

  const plaza        = emp.plaza        || '';
  const ciudadStr    = ciudad || plaza || 'Tijuana, B.C.';
  const nombreEmp    = emp.nombre_completo || '';
  const puesto       = emp.posicion     || '';
  const marca        = rawEquipo.marca  || snap.marca  || '';
  const modelo       = rawEquipo.modelo || snap.modelo || '';
  const descripcion  = [marca, modelo].filter(Boolean).join(' ');
  const codigoBarras = rawEquipo.codigo_barras || snap.codigo_barras || '—';
  const serie        = rawEquipo.serie  || snap.serie  || '—';
  const nombreRH     = rawEquipo.nombre_responsable_rh || '';
  const fol          = folio(rev.id);
  const fecha        = fmtDate(rev.fecha_revision);
  const danos        = Array.isArray(rawEquipo.danos) ? rawEquipo.danos : [];
  const firmaRH      = dec(rawEquipo.firma_responsable_rh);
  const firmaEmp     = dec(rawEquipo.firma_empleado);
  const firmaAud     = dec(rawEquipo.firma_auditor);

  const logoTag = oxxoLogoDataUrl
    ? `<img src="${oxxoLogoDataUrl}" alt="OXXO" style="height:56px;object-fit:contain">`
    : '<strong style="color:#e8540c;font-size:22px">OXXO</strong>';

  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Carta Responsiva Equipo - ${fol}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#000;background:#f3f4f6}
.page{width:210mm;max-width:100%;margin:10mm auto;padding:22mm 22mm;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.15)}
u{text-decoration:underline;padding:0 4px;display:inline-block;min-width:120px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:20px;text-align:center}
.sig-img{height:70px;max-width:100%;border-bottom:2px solid #111;display:block;margin:0 auto;object-fit:contain}
.sig-line{height:70px;border-bottom:2px solid #111}
.sig-title{font-weight:bold;margin-bottom:20px}
.testigo{text-align:center;margin-top:16px}
.testigo-img{height:56px;max-width:200px;border-bottom:2px solid #111;display:block;margin:0 auto;object-fit:contain}
.testigo-line{height:56px;border-bottom:2px solid #111;max-width:200px;margin:0 auto}
.footer{margin-top:24px;padding-top:12px;border-top:1px solid #d1d5db;font-size:8px;color:#6b7280}
.btn{position:fixed;top:10px;right:10px;background:#1e3a8a;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;z-index:999}
@page{margin-top:12mm}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;padding:14mm 18mm}.btn{display:none}}
</style>
</head>
<body>
<button class="btn" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},600);});</script>

<div class="page">
  <div style="display:flex;align-items:center;margin-bottom:20px">
    ${logoTag}
    <p style="flex:1;text-align:center;font-size:18px;font-weight:900;letter-spacing:.05em">
      PLAZA <u style="min-width:120px">${plaza || '_______________'}</u>
    </p>
  </div>

  <p style="text-align:right;font-size:13px;margin-bottom:20px">
    ${ciudadStr}, a <u style="min-width:140px">${fecha}</u>
  </p>

  <p style="font-size:13px;line-height:1.7;margin-bottom:20px">
    Hago entrega para uso laboral <strong>de Laptop <u>${descripcion || '___________________________'}</u></strong>,
    para el buen uso y al servicio de la Compañía <strong>CADENA COMERCIAL OXXO, S.A. DE C. V.</strong>
  </p>

  <div style="text-align:center;margin-bottom:16px">
    <p style="margin-bottom:12px"><strong>NUMERO DE ACTIVO:</strong> <u style="min-width:180px">${codigoBarras}</u></p>
    <p><strong>NÚMERO DE SERIE:</strong> <u style="min-width:180px">${serie}</u></p>
  </div>

  ${danos.length > 0 ? `
  <div style="margin-bottom:24px;padding:10px;border:1px solid #9ca3af;border-radius:4px;font-size:12px">
    <p style="font-weight:600;margin-bottom:4px">Daños o desperfectos registrados:</p>
    <ul style="padding-left:16px">${danos.map(d => `<li>${d.label || ''}${d.observacion ? ': ' + d.observacion : ''}</li>`).join('')}</ul>
  </div>` : ''}
  ${rawEquipo.comentarios ? `<p style="font-size:12px;margin-bottom:20px;color:#4b5563">Comentarios: <em>${rawEquipo.comentarios}</em></p>` : ''}

  <div class="sigs">
    <div>
      <p class="sig-title">ENTREGA</p>
      ${firmaRH ? `<img class="sig-img" src="${firmaRH}" alt="Firma RH">` : '<div class="sig-line"></div>'}
      <p style="font-weight:bold;margin-top:6px">RESPONSABLE DE RH</p>
      ${nombreRH ? `<p style="font-size:12px;color:#555;margin-top:2px">${nombreRH}</p>` : ''}
    </div>
    <div>
      <p class="sig-title">RECIBE</p>
      ${firmaEmp ? `<img class="sig-img" src="${firmaEmp}" alt="Firma empleado">` : '<div class="sig-line"></div>'}
      <p style="font-size:12px;margin-top:6px"><strong>Nombre:</strong> ${nombreEmp}</p>
      <p style="font-size:12px"><strong>Puesto:</strong> ${puesto || '—'}</p>
    </div>
  </div>

  <div class="testigo">
    <p style="font-weight:bold;margin-bottom:32px">TESTIGO</p>
    ${firmaAud ? `<img class="testigo-img" src="${firmaAud}" alt="Firma auditor">` : '<div class="testigo-line"></div>'}
    <p style="font-weight:bold;margin-top:6px">AUDITOR</p>
    ${rev.auditor_nombre ? `<p style="font-size:12px;color:#555;margin-top:2px">${rev.auditor_nombre}</p>` : ''}
  </div>

  <div class="footer">
    <p><strong>Validez y autenticidad del documento</strong></p>
    <p>Folio: <strong>${fol}</strong> · Generado: ${fmtFull(rev.fecha_revision)}</p>
    ${nombreRH ? `<p>Responsable RH: ${nombreRH}</p>` : ''}
    <p style="margin-top:4px">Documento generado digitalmente por el Sistema de Control de Herramienta — Cadena Comercial OXXO. Firmas electrónicas con validez conforme al Art. 1803 CCF.</p>
  </div>
</div>
</body></html>`;
}


const CHROMIUM_EXEC = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const CHROMIUM_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];

// Renders the app carta URL exactly as the browser would (same React component).
// Reuses an existing puppeteer browser instance per ZIP job for performance.
async function cartaToPDF(browser, path, authToken) {
  const port = process.env.PORT || 3001;
  const page = await browser.newPage();
  try {
    await page.setCookie({ name: 'siche_token', value: authToken, domain: 'localhost', path: '/' });
    await page.emulateMediaType('print');
    await page.goto(`http://localhost:${port}${path}`, { waitUntil: 'networkidle2', timeout: 30000 });
    // Wait for all async state (hash, ciudadConfig, signatures) to finish rendering
    await page.waitForSelector('body[data-carta-ready="1"]', { timeout: 10000 });
    // puppeteer-core 22+ returns Uint8Array; convert to Buffer for archiver compatibility
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
  } finally {
    await page.close();
  }
}

function buildResumenPDF(rev, rawAuto, rawEquipo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Resumen - ${folio(rev.id)}` } });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const emp = rev.empleado_snapshot || {};
      const ciudad = rev._ciudad || '';
      const COL1 = 50;

      const headerY = doc.y;
      if (oxxoLogoBuffer) {
        doc.image(oxxoLogoBuffer, COL1, headerY, { width: 60, height: 30 });
      } else {
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#e8540c').text('OXXO', COL1, headerY);
        doc.fillColor('black');
      }
      doc.font('Helvetica-Bold').fontSize(10).fillColor('black')
        .text('HOJA DE RESUMEN DE AUDITORIA', COL1 + 80, headerY + 2, { width: 360, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor('#4b5563')
        .text(`Folio: ${folio(rev.id)}`, COL1 + 80, headerY + 16, { width: 360, align: 'center' });
      doc.fillColor('black');

      doc.y = headerY + 38;
      doc.moveTo(COL1, doc.y).lineTo(545, doc.y).strokeColor('#888').stroke();
      doc.strokeColor('black');
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(9)
        .text(`${ciudad ? ciudad + ', ' : ''}${fmtDate(rev.fecha_revision)}`, { align: 'right' });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9).text('Auditor: ', { continued: true })
        .font('Helvetica-Bold').text(rev.auditor_nombre || '—');
      doc.moveDown(0.6);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#134e4a').text('DATOS DEL EMPLEADO');
      doc.fillColor('black');
      doc.moveDown(0.2);
      [
        ['Nombre', emp.nombre_completo || '—'],
        ['No. Empleado', emp.numero_empleado || '—'],
        ['Puesto', emp.posicion || '—'],
        ['Departamento', emp.departamento || '—'],
        ['Plaza', emp.plaza || '—'],
      ].forEach(([label, val]) => {
        doc.font('Helvetica-Bold').fontSize(8.5).text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(String(val));
      });

      if (rawAuto) {
        doc.moveDown(0.6);
        doc.moveTo(COL1, doc.y).lineTo(545, doc.y).strokeColor('#bfdbfe').stroke();
        doc.strokeColor('black');
        doc.moveDown(0.4);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e40af').text('AUTOMOVIL');
        doc.fillColor('black');
        doc.moveDown(0.2);

        const licVal = rawAuto.licencia_numero
          ? (rawAuto.licencia_numero === 'true' ? 'Si' : rawAuto.licencia_numero)
          : '—';

        [
          ['Modelo', rawAuto.no_modelo || '—'],
          ['Placas', rawAuto.placas || '—'],
          ['No. Serie', rawAuto.no_serie || '—'],
          ['Kilometraje', rawAuto.kilometraje != null ? `${rawAuto.kilometraje} km` : '—'],
          ['Poliza de seguro', boolStr(rawAuto.poliza_seguro)],
          ['Licencia de conducir', licVal],
          ['Llanta de refaccion', boolStr(rawAuto.llanta_refaccion)],
          ['Gato / Cruceta', boolStr(rawAuto.gato_cruceta)],
          ['Tarjeta de circulacion', boolStr(rawAuto.tarjeta_circulacion)],
        ].forEach(([label, val]) => {
          doc.font('Helvetica-Bold').fontSize(8.5).text(`${label}: `, { continued: true });
          doc.font('Helvetica').text(String(val));
        });

        const autoDanos = Array.isArray(rawAuto.danos) ? rawAuto.danos : [];
        if (autoDanos.length > 0) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#92400e').text('Danos:');
          autoDanos.forEach(d => {
            doc.font('Helvetica').fontSize(7.5).fillColor('#78350f')
              .text(`  - ${String(d.label || '')}${d.observacion ? ': ' + String(d.observacion) : ''}`);
          });
          doc.fillColor('black');
        }
        if (rawAuto.comentarios) {
          doc.moveDown(0.2);
          doc.font('Helvetica').fontSize(8).fillColor('#374151').text(`Comentarios: ${rawAuto.comentarios}`);
          doc.fillColor('black');
        }
      }

      if (rawEquipo) {
        doc.moveDown(0.6);
        doc.moveTo(COL1, doc.y).lineTo(545, doc.y).strokeColor('#ddd6fe').stroke();
        doc.strokeColor('black');
        doc.moveDown(0.4);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6d28d9').text('EQUIPO DE COMPUTO');
        doc.fillColor('black');
        doc.moveDown(0.2);

        [
          ['No. Activo (CB)', rawEquipo.codigo_barras || '—'],
          ['Marca', rawEquipo.marca || '—'],
          ['Modelo', rawEquipo.modelo || '—'],
          ['No. Serie', rawEquipo.serie || '—'],
        ].forEach(([label, val]) => {
          doc.font('Helvetica-Bold').fontSize(8.5).text(`${label}: `, { continued: true });
          doc.font('Helvetica').text(String(val));
        });

        const equipoDanos = Array.isArray(rawEquipo.danos) ? rawEquipo.danos : [];
        if (equipoDanos.length > 0) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#92400e').text('Danos:');
          equipoDanos.forEach(d => {
            doc.font('Helvetica').fontSize(7.5).fillColor('#78350f')
              .text(`  - ${String(d.label || '')}${d.observacion ? ': ' + String(d.observacion) : ''}`);
          });
          doc.fillColor('black');
        }
        if (rawEquipo.comentarios) {
          doc.moveDown(0.2);
          doc.font('Helvetica').fontSize(8).fillColor('#374151').text(`Comentarios: ${rawEquipo.comentarios}`);
          doc.fillColor('black');
        }
      }

      doc.moveDown(0.8);
      const footLineY = doc.y;
      doc.moveTo(COL1, footLineY).lineTo(545, footLineY).strokeColor('#d1d5db').stroke();
      doc.strokeColor('black');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(7).fillColor('#6b7280')
        .text(
          `Folio: ${folio(rev.id)}  |  Revision: ${fmtFull(rev.fecha_revision)}  |  Auditor: ${rev.auditor_nombre || '—'}`,
          COL1, doc.y, { align: 'center', width: 495 }
        );
      doc.text('Sistema de Control de Herramienta — Cadena Comercial OXXO, S.A. DE C.V.', { align: 'center', width: 495 });

      doc.end();
    } catch (err) { reject(err); }
  });
}

async function buildExcelBuffer(revs, autoByRevId, equipoByRevId) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Revisiones');
  ws.columns = [
    { header: 'Folio',          key: 'folio',        width: 14 },
    { header: 'Fecha',          key: 'fecha',        width: 22 },
    { header: 'Auditor',        key: 'auditor',      width: 20 },
    { header: 'No. Empleado',   key: 'num_emp',      width: 14 },
    { header: 'Nombre',         key: 'nombre',       width: 30 },
    { header: 'Posición',       key: 'posicion',     width: 25 },
    { header: 'Departamento',   key: 'depto',        width: 25 },
    { header: 'Plaza',          key: 'plaza',        width: 15 },
    { header: 'Auto',           key: 'tiene_auto',   width: 8  },
    { header: 'Placas',         key: 'placas',       width: 12 },
    { header: 'No. Serie Auto', key: 'no_serie',     width: 20 },
    { header: 'Kilometraje',    key: 'km',           width: 12 },
    { header: 'Póliza Seguro',  key: 'poliza',       width: 14 },
    { header: 'Licencia',       key: 'licencia',     width: 12 },
    { header: 'Llanta Ref.',    key: 'llanta',       width: 12 },
    { header: 'Gato/Cruceta',   key: 'gato',         width: 13 },
    { header: 'Tarjeta Circ.',  key: 'tarjeta',      width: 13 },
    { header: 'Daños Auto',     key: 'danos_auto',   width: 40 },
    { header: 'Coment. Auto',  key: 'coments_auto', width: 30 },
    { header: 'Equipo',         key: 'tiene_equipo', width: 8  },
    { header: 'CB Equipo',      key: 'cb_equipo',    width: 15 },
    { header: 'Marca',          key: 'marca',        width: 15 },
    { header: 'Modelo',         key: 'modelo',       width: 15 },
    { header: 'Serie Equipo',   key: 'serie_equipo', width: 20 },
    { header: 'Daños Equipo',   key: 'danos_equipo', width: 40 },
    { header: 'Coment. Equipo', key: 'coments_equipo', width: 30 },
    { header: 'Observaciones',  key: 'observaciones',  width: 35 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF134e4a' } };

  const safe = (v) => typeof v === 'string' && /^[=+\-@|%]/.test(v) ? `'${v}` : (v || '');
  const yn = (v) => (v == null || v === '') ? '' : (v === true || v === 'true' || v === 1) ? 'Sí' : 'No';

  for (const r of revs) {
    const emp = (r.empleado_snapshot && typeof r.empleado_snapshot === 'object') ? r.empleado_snapshot : {};
    const ra = autoByRevId[r.id];
    const re = equipoByRevId[r.id];
    const parseDanosArr = (raw) => { try { const a = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(a) ? a : []; } catch { return []; } };
    const autoDanosArr = ra ? parseDanosArr(ra.danos) : [];
    const equipoDanosArr = re ? parseDanosArr(re.danos) : [];
    ws.addRow({
      folio:        folio(r.id),
      fecha:        r.fecha_revision ? new Date(r.fecha_revision).toLocaleString('es-MX', { timeZone: TZ }) : '',
      auditor:      safe(r.auditor_nombre),
      num_emp:      safe(emp.numero_empleado),
      nombre:       safe(emp.nombre_completo),
      posicion:     safe(emp.posicion),
      depto:        safe(emp.departamento),
      plaza:        safe(emp.plaza),
      tiene_auto:   r.tiene_auto  ? 'Sí' : 'No',
      placas:       ra ? safe(ra.placas)          : '',
      no_serie:     ra ? safe(ra.no_serie)         : '',
      km:           ra ? (ra.kilometraje || '')    : '',
      poliza:       ra ? yn(ra.poliza_seguro)      : '',
      licencia:     ra ? yn(ra.licencia_numero)    : '',
      llanta:       ra ? yn(ra.llanta_refaccion)   : '',
      gato:         ra ? yn(ra.gato_cruceta)       : '',
      tarjeta:      ra ? yn(ra.tarjeta_circulacion): '',
      danos_auto:    autoDanosArr.map(d => `${d.label || ''}${d.observacion ? ': ' + d.observacion : ''}`).join(' | ') || '',
      coments_auto:  ra ? safe(ra.comentarios) : '',
      tiene_equipo:  r.tiene_equipo ? 'Sí' : 'No',
      cb_equipo:     re ? safe(re.codigo_barras) : '',
      marca:         re ? safe(re.marca)         : '',
      modelo:        re ? safe(re.modelo)        : '',
      serie_equipo:  re ? safe(re.serie)         : '',
      danos_equipo:  equipoDanosArr.map(d => `${d.label || ''}${d.observacion ? ': ' + d.observacion : ''}`).join(' | ') || '',
      coments_equipo: re ? safe(re.comentarios) : '',
      observaciones:  safe(r.observaciones || ''),
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ── Background job store ──────────────────────────────────────────────────────

const jobs = new Map();

setInterval(() => {
  const cutoff = Date.now() - 3600000; // 1 hora
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 300000);

async function runGenerarZip(jobId, params, authToken) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    const { desde, hasta } = params;

    let q = `SELECT r.id, r.fecha_revision, r.auditor_nombre, r.empleado_snapshot,
              r.tiene_auto, r.tiene_equipo, r.observaciones,
              cfg.value AS ciudad
             FROM revisiones r
             LEFT JOIN app_config cfg ON cfg.key = 'ciudad_revision'
             WHERE 1=1`;
    const qParams = [];
    if (desde) { qParams.push(desde); q += ` AND r.fecha_revision >= $${qParams.length}`; }
    if (hasta) { qParams.push(hasta); q += ` AND r.fecha_revision <= $${qParams.length}`; }
    q += ' ORDER BY r.fecha_revision DESC';

    const { rows: revs } = await pool.query(q, qParams);
    if (revs.length === 0) {
      job.status = 'error';
      job.error = 'No hay revisiones en el rango indicado';
      return;
    }

    job.total = revs.length;
    job.status = 'processing';

    const revIds = revs.map(r => r.id);
    const [{ rows: autoRows }, { rows: equipoRows }] = await Promise.all([
      pool.query('SELECT * FROM revision_auto WHERE revision_id = ANY($1::int[])', [revIds]),
      pool.query('SELECT * FROM revision_equipo WHERE revision_id = ANY($1::int[])', [revIds]),
    ]);

    const autoByRevId = {};
    for (const a of autoRows) autoByRevId[a.revision_id] = a;
    const equipoByRevId = {};
    for (const e of equipoRows) equipoByRevId[e.revision_id] = e;

    const entries = [];

    // Launch one browser for all PDFs in this ZIP job
    const browser = await puppeteer.launch({ executablePath: CHROMIUM_EXEC, args: CHROMIUM_ARGS, headless: true });
    try {
      for (const rev of revs) {
        try {
          const emp = (rev.empleado_snapshot && typeof rev.empleado_snapshot === 'object')
            ? rev.empleado_snapshot : {};
          const empName = safeFilename(emp.nombre_completo || '');
          const folder = `${empName}_${folio(rev.id)}`;

          const rawAuto = autoByRevId[rev.id] || null;
          const rawEquipo = equipoByRevId[rev.id] || null;

          // Carta Auto — render via the same React component the user sees
          if (rawAuto) {
            try {
              const autoPdfBuf = await cartaToPDF(browser, `/carta/auto/${rev.id}`, authToken);
              entries.push({ p: `${folder}/Carta_Auto.pdf`, buf: autoPdfBuf });
            } catch (pdfErr) {
              console.error(`ZIP: Carta_Auto rev ${rev.id} falló: ${pdfErr.message}`);
            }

            // foto_condiciones
            let rawFotos = rawAuto.foto_condiciones;
            if (typeof rawFotos === 'string') { try { rawFotos = JSON.parse(rawFotos); } catch { rawFotos = []; } }
            const condFotos = decryptArr(Array.isArray(rawFotos) ? rawFotos : []);
            condFotos.forEach((f, i) => {
              const buf = dataUrlToBuffer(f);
              if (buf) entries.push({ p: `${folder}/foto_condicion_${String(i + 1).padStart(2, '0')}.jpg`, buf });
            });

            [
              ['foto_licencia.jpg',           rawAuto.foto_licencia],
              ['foto_licencia_reverso.jpg',   rawAuto.foto_licencia_reverso],
              ['foto_tarjeta_circulacion.jpg',rawAuto.foto_tarjeta_circulacion],
              ['foto_poliza_seguro.jpg',      rawAuto.foto_poliza_seguro],
              ['foto_llanta_refaccion.jpg',   rawAuto.foto_llanta_refaccion],
            ].forEach(([name, enc]) => {
              const val = dec(enc);
              if (val) {
                const buf = dataUrlToBuffer(val);
                if (buf) entries.push({ p: `${folder}/${name}`, buf });
              }
            });
          }

          // Carta Equipo — render via the same React component
          if (rawEquipo) {
            try {
              const equipoPdfBuf = await cartaToPDF(browser, `/carta/equipo/${rev.id}`, authToken);
              entries.push({ p: `${folder}/Carta_Equipo.pdf`, buf: equipoPdfBuf });
            } catch (pdfErr) {
              console.error(`ZIP: Carta_Equipo rev ${rev.id} falló: ${pdfErr.message}`);
            }

            const fotoEquipo = dec(rawEquipo.foto_equipo);
            if (fotoEquipo) {
              const buf = dataUrlToBuffer(fotoEquipo);
              if (buf) entries.push({ p: `${folder}/foto_equipo.jpg`, buf });
            }
          }
        } catch (revErr) {
          console.error(`ZIP: Error procesando rev ${rev.id}: ${revErr.message}`);
        }

        job.current = job.current + 1;
      }
    } finally {
      await browser.close();
    }

    // Excel resumen al inicio del ZIP
    try {
      const excelBuf = await buildExcelBuffer(revs, autoByRevId, equipoByRevId);
      const fechaStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ }).replace(/\//g, '-');
      entries.unshift({ p: `SICHE_Revisiones_${fechaStr}.xlsx`, buf: excelBuf });
    } catch (excelErr) {
      console.error('ZIP: Error generando Excel:', excelErr.message);
    }

    // Ensamblar ZIP en memoria
    const { PassThrough } = require('stream');
    const archive = archiver('zip', { zlib: { level: 6 } });
    const pass = new PassThrough();
    archive.pipe(pass);
    const zipChunks = [];
    pass.on('data', c => zipChunks.push(c));
    await new Promise((resolve, reject) => {
      pass.on('end', resolve);
      archive.on('error', reject);
      for (const { p, buf } of entries) {
        if (buf && Buffer.isBuffer(buf) && buf.length > 0) {
          archive.append(buf, { name: p });
        }
      }
      archive.finalize();
    });

    if (entries.length === 0) {
      job.status = 'error';
      job.error = 'No se generó ningún archivo. Revisa que las revisiones tengan datos.';
      return;
    }

    job.buf = Buffer.concat(zipChunks);
    job.status = 'ready';
  } catch (err) {
    console.error(`Error en job ZIP ${jobId}:`, err);
    job.status = 'error';
    job.error = err?.message || 'Error desconocido al generar el archivo';
  }
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

// Iniciar generación (devuelve jobId inmediatamente)
router.post('/generar', requireExportAccess, (req, res) => {
  const { desde, hasta } = req.body || {};
  const authToken = req.cookies?.siche_token || '';
  const jobId = crypto.randomBytes(8).toString('hex');
  jobs.set(jobId, {
    status: 'pending', current: 0, total: 0,
    buf: null, error: null, createdAt: Date.now(),
  });
  runGenerarZip(jobId, { desde, hasta }, authToken).catch(() => {});
  res.json({ jobId });
});

// Consultar estado del job
router.get('/estado/:jobId', requireExportAccess, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job no encontrado o expirado' });
  res.json({ status: job.status, current: job.current, total: job.total, error: job.error });
});

// Descargar ZIP cuando esté listo
router.get('/descargar/:jobId', requireExportAccess, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job no encontrado o expirado' });
  if (job.status !== 'ready') return res.status(400).json({ error: 'Archivo aun no disponible' });

  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="SICHE_Revisiones_${fecha}.zip"`);
  res.setHeader('Content-Length', job.buf.length);
  res.send(job.buf);
  jobs.delete(req.params.jobId);
});

module.exports = router;
