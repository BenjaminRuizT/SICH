const crypto = require('crypto');
const router = require('express').Router();
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
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

function fmtDate(d) {
  if (!d) return '___________________';
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtFull(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
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
    const b64 = dataUrl.replace(/^data:image\/[a-z+]+;base64,/, '');
    if (!b64) return null;
    return Buffer.from(b64, 'base64');
  } catch { return null; }
}

let oxxoLogoBuffer = null;
try {
  const logoPath = path.join(__dirname, '../../frontend/public/oxxo.png');
  if (fs.existsSync(logoPath)) oxxoLogoBuffer = fs.readFileSync(logoPath);
} catch {}

// ── PDF builders ─────────────────────────────────────────────────────────────

function buildAutoPDF(rev, auto) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Carta Compromiso Auto - ${folio(rev.id)}` } });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const emp = rev.empleado_snapshot || {};
      const snap = (auto.herramienta_snapshot && typeof auto.herramienta_snapshot === 'object')
        ? auto.herramienta_snapshot : {};
      const plaza = emp.plaza || '—';
      const nombreEmp = emp.nombre_completo || '—';
      const puesto = emp.posicion || '—';
      const depto = emp.departamento || '';
      const ciudad = rev._ciudad || '';
      const COL1 = 50, COL2 = 220, COL3 = 390;
      const SIGW = 140, SIGH = 55;

      const headerY = doc.y;
      if (oxxoLogoBuffer) {
        doc.image(oxxoLogoBuffer, COL1, headerY, { width: 60, height: 30 });
      } else {
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#e8540c').text('OXXO', COL1, headerY);
        doc.fillColor('black');
      }
      doc.font('Helvetica-Bold').fontSize(10).fillColor('black')
        .text(`PLAZA  ${plaza}`, COL1 + 80, headerY + 5, { width: 360, align: 'center' });

      doc.y = headerY + 38;
      doc.moveTo(COL1, doc.y).lineTo(545, doc.y).strokeColor('#888').stroke();
      doc.strokeColor('black');
      doc.moveDown(0.4);

      doc.font('Helvetica').fontSize(9)
        .text(`${ciudad ? ciudad + ', a ' : ''}${fmtDate(rev.fecha_revision)}`, { align: 'right' });
      doc.moveDown(0.4);

      const modelo = auto.no_modelo || snap.modelo || '—';
      doc.font('Helvetica').fontSize(10)
        .text('Hace constar que el empleado ', { continued: true })
        .font('Helvetica-Bold').text(nombreEmp, { continued: true })
        .font('Helvetica').text(', con puesto ', { continued: true })
        .font('Helvetica-Bold').text(puesto, { continued: true })
        .font('Helvetica').text(
          `${depto ? ` (${depto})` : ''}, recibe para uso laboral al servicio de CADENA COMERCIAL OXXO, S.A. DE C.V. el siguiente vehiculo:`,
          { align: 'justify' }
        );
      doc.moveDown(0.5);

      const dataItems = [
        ['Modelo', modelo],
        ['Placas', auto.placas || '—'],
        ['No. de Serie', auto.no_serie || snap.serie || '—'],
        ['Kilometraje', auto.kilometraje != null ? `${auto.kilometraje} km` : '—'],
        ['Codigo de barras', auto.codigo_barras || snap.codigo_barras || '—'],
        ['Domicilio del empleado', auto.domicilio || '—'],
      ];
      const dtY = doc.y;
      doc.rect(COL1, dtY, 495, dataItems.length * 16 + 10).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('black');
      dataItems.forEach(([label, val], i) => {
        doc.font('Helvetica-Bold').fontSize(8.5).text(`${label}:`, COL1 + 6, dtY + 5 + i * 16, { continued: true, width: 130 });
        doc.font('Helvetica').text(` ${val}`, { width: 350 });
      });
      doc.y = dtY + dataItems.length * 16 + 16;
      doc.moveDown(0.4);

      doc.font('Helvetica-Bold').fontSize(9).text('Verificacion de accesorios:');
      doc.moveDown(0.2);
      const checks = [
        ['Poliza de seguro', auto.poliza_seguro],
        ['Licencia de conducir', auto.licencia_numero != null ? true : null],
        ['Llanta de refaccion', auto.llanta_refaccion],
        ['Gato / Cruceta', auto.gato_cruceta],
        ['Tarjeta de circulacion', auto.tarjeta_circulacion],
      ];
      const chkY = doc.y;
      checks.forEach(([label, val], i) => {
        const v = boolStr(val);
        const mark = v === 'Si' ? '[SI]' : v === 'No' ? '[NO]' : '[--]';
        const col = i % 2 === 0 ? COL1 : 290;
        const row = Math.floor(i / 2);
        doc.font('Helvetica-Bold').fontSize(8.5)
          .fillColor(v === 'Si' ? '#166534' : v === 'No' ? '#991b1b' : '#4b5563')
          .text(mark, col, chkY + row * 15, { continued: true });
        doc.font('Helvetica').fillColor('black').text(` ${label}`);
      });
      doc.y = chkY + Math.ceil(checks.length / 2) * 15 + 6;

      const danos = Array.isArray(auto.danos) ? auto.danos : [];
      if (danos.length > 0) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e').text('Danos / desperfectos registrados:');
        danos.forEach(d => {
          doc.font('Helvetica').fontSize(8).fillColor('#78350f')
            .text(`  - ${String(d.label || '')}${d.observacion ? ': ' + String(d.observacion) : ''}`);
        });
        doc.fillColor('black');
      }
      if (auto.comentarios) {
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(`Comentarios: ${auto.comentarios}`);
        doc.fillColor('black');
      }

      doc.moveDown(1.2);
      const sigLabelY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('AUTORIZA', COL1, sigLabelY, { width: SIGW, align: 'center' });
      doc.text('ACEPTA', COL2, sigLabelY, { width: SIGW, align: 'center' });
      doc.text('TESTIGO', COL3, sigLabelY, { width: SIGW, align: 'center' });

      const sigImgY = sigLabelY + 14;
      addSig(doc, dec(auto.firma_responsable_rh), COL1, sigImgY, SIGW, SIGH);
      addSig(doc, dec(auto.firma_empleado), COL2, sigImgY, SIGW, SIGH);
      addSig(doc, dec(auto.firma_auditor), COL3, sigImgY, SIGW, SIGH);

      const lineY = sigImgY + SIGH + 2;
      [COL1, COL2, COL3].forEach(x => doc.moveTo(x, lineY).lineTo(x + SIGW, lineY).strokeColor('#333').stroke());
      doc.strokeColor('black');

      const nameY = lineY + 4;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('black');
      doc.text('RESPONSABLE DE RH', COL1, nameY, { width: SIGW, align: 'center' });
      doc.text('EMPLEADO', COL2, nameY, { width: SIGW, align: 'center' });
      doc.text('AUDITOR', COL3, nameY, { width: SIGW, align: 'center' });
      doc.font('Helvetica').fontSize(7.5).fillColor('#4b5563');
      if (auto.nombre_responsable_rh) doc.text(auto.nombre_responsable_rh, COL1, nameY + 11, { width: SIGW, align: 'center' });
      doc.text(nombreEmp, COL2, nameY + 11, { width: SIGW, align: 'center' });
      if (rev.auditor_nombre) doc.text(rev.auditor_nombre, COL3, nameY + 11, { width: SIGW, align: 'center' });

      const footY = nameY + 30;
      doc.moveTo(COL1, footY).lineTo(545, footY).strokeColor('#d1d5db').stroke();
      doc.strokeColor('black');
      doc.font('Helvetica').fontSize(7).fillColor('#6b7280')
        .text(`Folio: ${folio(rev.id)}  |  Revision: ${fmtFull(rev.fecha_revision)}  |  Auditor: ${rev.auditor_nombre || '—'}`, COL1, footY + 4, { align: 'center', width: 495 });
      doc.text('Sistema de Control de Herramienta — Cadena Comercial OXXO, S.A. DE C.V.', { align: 'center', width: 495 });

      doc.end();
    } catch (err) { reject(err); }
  });
}

function buildEquipoPDF(rev, equipo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Carta Responsiva Equipo - ${folio(rev.id)}` } });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const emp = rev.empleado_snapshot || {};
      const snap = (equipo.herramienta_snapshot && typeof equipo.herramienta_snapshot === 'object')
        ? equipo.herramienta_snapshot : {};
      const plaza = emp.plaza || '—';
      const nombreEmp = emp.nombre_completo || '—';
      const ciudad = rev._ciudad || '';
      const COL1 = 50, COL2 = 220, COL3 = 390;
      const SIGW = 140, SIGH = 55;

      const headerY = doc.y;
      if (oxxoLogoBuffer) {
        doc.image(oxxoLogoBuffer, COL1, headerY, { width: 60, height: 30 });
      } else {
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#e8540c').text('OXXO', COL1, headerY);
        doc.fillColor('black');
      }
      doc.font('Helvetica-Bold').fontSize(10).fillColor('black')
        .text(`PLAZA  ${plaza}`, COL1 + 80, headerY + 5, { width: 360, align: 'center' });

      doc.y = headerY + 38;
      doc.moveTo(COL1, doc.y).lineTo(545, doc.y).strokeColor('#888').stroke();
      doc.strokeColor('black');
      doc.moveDown(0.4);

      doc.font('Helvetica').fontSize(9)
        .text(`${ciudad ? ciudad + ', a ' : ''}${fmtDate(rev.fecha_revision)}`, { align: 'right' });
      doc.moveDown(0.5);

      const marca = equipo.marca || snap.marca || '—';
      const modelo = equipo.modelo || snap.modelo || '—';
      doc.font('Helvetica').fontSize(10)
        .text('Hago entrega para uso laboral de Laptop ', { continued: true })
        .font('Helvetica-Bold').text(`${marca} ${modelo}`, { continued: true })
        .font('Helvetica').text(', al servicio de CADENA COMERCIAL OXXO, S.A. DE C.V.', { align: 'justify' });
      doc.moveDown(0.5);

      const dataItems = [
        ['No. Activo (CB)', equipo.codigo_barras || snap.codigo_barras || '—'],
        ['Marca', marca],
        ['Modelo', modelo],
        ['No. de Serie', equipo.serie || snap.serie || '—'],
      ];
      const dtY = doc.y;
      doc.rect(COL1, dtY, 495, dataItems.length * 16 + 10).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('black');
      dataItems.forEach(([label, val], i) => {
        doc.font('Helvetica-Bold').fontSize(8.5).text(`${label}:`, COL1 + 6, dtY + 5 + i * 16, { continued: true, width: 130 });
        doc.font('Helvetica').text(` ${val}`, { width: 350 });
      });
      doc.y = dtY + dataItems.length * 16 + 16;

      const danos = Array.isArray(equipo.danos) ? equipo.danos : [];
      if (danos.length > 0) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e').text('Danos / desperfectos registrados:');
        danos.forEach(d => {
          doc.font('Helvetica').fontSize(8).fillColor('#78350f')
            .text(`  - ${String(d.label || '')}${d.observacion ? ': ' + String(d.observacion) : ''}`);
        });
        doc.fillColor('black');
      }
      if (equipo.comentarios) {
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(`Comentarios: ${equipo.comentarios}`);
        doc.fillColor('black');
      }

      doc.moveDown(1.5);
      const sigLabelY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('ENTREGA', COL1, sigLabelY, { width: SIGW, align: 'center' });
      doc.text('RECIBE', COL2, sigLabelY, { width: SIGW, align: 'center' });
      doc.text('TESTIGO', COL3, sigLabelY, { width: SIGW, align: 'center' });

      const sigImgY = sigLabelY + 14;
      addSig(doc, dec(equipo.firma_responsable_rh), COL1, sigImgY, SIGW, SIGH);
      addSig(doc, dec(equipo.firma_empleado), COL2, sigImgY, SIGW, SIGH);
      addSig(doc, dec(equipo.firma_auditor), COL3, sigImgY, SIGW, SIGH);

      const lineY = sigImgY + SIGH + 2;
      [COL1, COL2, COL3].forEach(x => doc.moveTo(x, lineY).lineTo(x + SIGW, lineY).strokeColor('#333').stroke());
      doc.strokeColor('black');

      const nameY = lineY + 4;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('black');
      doc.text('RESPONSABLE DE RH', COL1, nameY, { width: SIGW, align: 'center' });
      doc.text('EMPLEADO', COL2, nameY, { width: SIGW, align: 'center' });
      doc.text('AUDITOR', COL3, nameY, { width: SIGW, align: 'center' });
      doc.font('Helvetica').fontSize(7.5).fillColor('#4b5563');
      if (equipo.nombre_responsable_rh) doc.text(equipo.nombre_responsable_rh, COL1, nameY + 11, { width: SIGW, align: 'center' });
      doc.text(nombreEmp, COL2, nameY + 11, { width: SIGW, align: 'center' });
      if (rev.auditor_nombre) doc.text(rev.auditor_nombre, COL3, nameY + 11, { width: SIGW, align: 'center' });

      const footY = nameY + 30;
      doc.moveTo(COL1, footY).lineTo(545, footY).strokeColor('#d1d5db').stroke();
      doc.strokeColor('black');
      doc.font('Helvetica').fontSize(7).fillColor('#6b7280')
        .text(`Folio: ${folio(rev.id)}  |  Empleado: ${nombreEmp}  |  Revision: ${fmtFull(rev.fecha_revision)}`, COL1, footY + 4, { align: 'center', width: 495 });
      doc.text('Sistema de Control de Herramienta — Cadena Comercial OXXO, S.A. DE C.V.', { align: 'center', width: 495 });

      doc.end();
    } catch (err) { reject(err); }
  });
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

// ── Background job store ──────────────────────────────────────────────────────

const jobs = new Map();

setInterval(() => {
  const cutoff = Date.now() - 3600000; // 1 hora
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 300000);

async function runGenerarZip(jobId, params) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    const { desde, hasta } = params;

    let q = `SELECT r.id, r.fecha_revision, r.auditor_nombre, r.empleado_snapshot,
              r.tiene_auto, r.tiene_equipo,
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

    for (const rev of revs) {
      const emp = (rev.empleado_snapshot && typeof rev.empleado_snapshot === 'object')
        ? rev.empleado_snapshot : {};
      const empName = safeFilename(emp.nombre_completo || '');
      const folder = `${empName}_${folio(rev.id)}`;

      const revObj = {
        id: rev.id,
        fecha_revision: rev.fecha_revision,
        auditor_nombre: rev.auditor_nombre,
        empleado_snapshot: emp,
        _ciudad: rev.ciudad || '',
      };

      const rawAuto = autoByRevId[rev.id] || null;
      const rawEquipo = equipoByRevId[rev.id] || null;

      // Resumen
      const resumenBuf = await buildResumenPDF(revObj, rawAuto, rawEquipo);
      entries.push({ p: `${folder}/Resumen.pdf`, buf: resumenBuf });

      // Carta Auto + fotos
      if (rawAuto) {
        const autoBuf = await buildAutoPDF(revObj, rawAuto);
        entries.push({ p: `${folder}/Carta_Auto.pdf`, buf: autoBuf });

        const condFotos = decryptArr(Array.isArray(rawAuto.foto_condiciones) ? rawAuto.foto_condiciones : []);
        condFotos.forEach((f, i) => {
          const buf = dataUrlToBuffer(f);
          if (buf) entries.push({ p: `${folder}/foto_condicion_${String(i + 1).padStart(2, '0')}.jpg`, buf });
        });

        [
          ['foto_licencia.jpg', rawAuto.foto_licencia],
          ['foto_licencia_reverso.jpg', rawAuto.foto_licencia_reverso],
          ['foto_tarjeta_circulacion.jpg', rawAuto.foto_tarjeta_circulacion],
          ['foto_poliza_seguro.jpg', rawAuto.foto_poliza_seguro],
          ['foto_llanta_refaccion.jpg', rawAuto.foto_llanta_refaccion],
        ].forEach(([name, enc]) => {
          const decrypted = dec(enc);
          if (decrypted) {
            const buf = dataUrlToBuffer(decrypted);
            if (buf) entries.push({ p: `${folder}/${name}`, buf });
          }
        });
      }

      // Carta Equipo + foto
      if (rawEquipo) {
        const equipoBuf = await buildEquipoPDF(revObj, rawEquipo);
        entries.push({ p: `${folder}/Carta_Equipo.pdf`, buf: equipoBuf });

        const fotoEquipo = dec(rawEquipo.foto_equipo);
        if (fotoEquipo) {
          const buf = dataUrlToBuffer(fotoEquipo);
          if (buf) entries.push({ p: `${folder}/foto_equipo.jpg`, buf });
        }
      }

      job.current = job.current + 1;
    }

    // Ensamblar ZIP en memoria
    const archive = archiver('zip', { zlib: { level: 6 } });
    const zipChunks = [];
    archive.on('data', c => zipChunks.push(c));
    await new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
      for (const { p, buf } of entries) archive.append(buf, { name: p });
      archive.finalize();
    });

    job.buf = Buffer.concat(zipChunks);
    job.status = 'ready';
  } catch (err) {
    console.error(`Error en job ZIP ${jobId}:`, err);
    job.status = 'error';
    job.error = 'Error al generar el archivo';
  }
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

// Iniciar generación (devuelve jobId inmediatamente)
router.post('/generar', requireExportAccess, (req, res) => {
  const { desde, hasta } = req.body || {};
  const jobId = crypto.randomBytes(8).toString('hex');
  jobs.set(jobId, {
    status: 'pending', current: 0, total: 0,
    buf: null, error: null, createdAt: Date.now(),
  });
  runGenerarZip(jobId, { desde, hasta }).catch(() => {});
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
