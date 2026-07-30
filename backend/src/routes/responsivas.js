const router = require('express').Router();
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { decrypt } = require('../utils/crypto');

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

// Try to load OXXO logo once at startup
let oxxoLogoBuffer = null;
try {
  const logoPath = path.join(__dirname, '../../frontend/public/oxxo.png');
  if (fs.existsSync(logoPath)) oxxoLogoBuffer = fs.readFileSync(logoPath);
} catch {}

function buildAutoPDF(rev, auto) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Carta Compromiso Auto - ${folio(rev.id)}` } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const emp = rev.empleado_snapshot || {};
    const snap = auto.herramienta_snapshot || {};
    const plaza = emp.plaza || '—';
    const nombreEmp = emp.nombre_completo || rev.nombre_completo || '—';
    const puesto = emp.posicion || '—';
    const depto = emp.departamento || '';
    const ciudad = rev._ciudad || '';

    const COL1 = 50, COL2 = 220, COL3 = 390;
    const SIGW = 140, SIGH = 55;

    // ── Header ──────────────────────────────────────────────────────────────
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

    // ── Fecha ────────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(9)
      .text(`${ciudad ? ciudad + ', a ' : ''}${fmtDate(rev.fecha_revision)}`, { align: 'right' });
    doc.moveDown(0.4);

    // ── Cuerpo ───────────────────────────────────────────────────────────────
    const modelo = auto.no_modelo || snap.modelo || '—';
    doc.font('Helvetica').fontSize(10).text(
      `Hace constar que el empleado `, { continued: true }
    ).font('Helvetica-Bold').text(nombreEmp, { continued: true })
      .font('Helvetica').text(`, con puesto `, { continued: true })
      .font('Helvetica-Bold').text(puesto, { continued: true })
      .font('Helvetica').text(`${depto ? ` (${depto})` : ''}, recibe para uso laboral al servicio de CADENA COMERCIAL OXXO, S.A. DE C.V. el siguiente vehículo:`,
      { align: 'justify' });
    doc.moveDown(0.5);

    // ── Datos del vehículo ───────────────────────────────────────────────────
    const dataItems = [
      ['Modelo', modelo],
      ['Placas', auto.placas || '—'],
      ['No. de Serie', auto.no_serie || snap.serie || '—'],
      ['Kilometraje', auto.kilometraje != null ? `${auto.kilometraje} km` : '—'],
      ['Código de barras', auto.codigo_barras || snap.codigo_barras || '—'],
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

    // ── Checklist ────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).text('Verificación de accesorios:');
    doc.moveDown(0.2);

    const checks = [
      ['Poliza de seguro', auto.poliza_seguro],
      ['Licencia de conducir', auto.licencia_numero != null ? true : null],
      ['Llanta de refaccion', auto.llanta_refaccion],
      ['Gato / Cruceta', auto.gato_cruceta],
      ['Tarjeta de circulacion', auto.tarjeta_circulacion],
    ];
    const chkY = doc.y;
    checks.forEach((c, i) => {
      const v = boolStr(c[1]);
      const mark = v === 'Si' ? '[SI]' : v === 'No' ? '[NO]' : '[--]';
      const col = i % 2 === 0 ? COL1 : 290;
      const row = Math.floor(i / 2);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(v === 'Si' ? '#166534' : v === 'No' ? '#991b1b' : '#4b5563')
        .text(mark, col, chkY + row * 15, { continued: true });
      doc.font('Helvetica').fillColor('black').text(` ${c[0]}`);
    });
    doc.y = chkY + Math.ceil(checks.length / 2) * 15 + 6;

    // ── Daños ────────────────────────────────────────────────────────────────
    const danos = Array.isArray(auto.danos) ? auto.danos : [];
    if (danos.length > 0) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e').text('Danos / desperfectos registrados:');
      danos.forEach(d => {
        doc.font('Helvetica').fontSize(8).fillColor('#78350f')
          .text(`  • ${d.label}${d.observacion ? ': ' + d.observacion : ''}`);
      });
      doc.fillColor('black');
    }

    if (auto.comentarios) {
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8.5).fillColor('#374151')
        .text(`Comentarios: ${auto.comentarios}`);
      doc.fillColor('black');
    }

    // ── Firmas ───────────────────────────────────────────────────────────────
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
    [COL1, COL2, COL3].forEach(x => {
      doc.moveTo(x, lineY).lineTo(x + SIGW, lineY).strokeColor('#333').stroke();
    });
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

    // ── Pie ──────────────────────────────────────────────────────────────────
    const footY = nameY + 30;
    doc.moveTo(COL1, footY).lineTo(545, footY).strokeColor('#d1d5db').stroke();
    doc.strokeColor('black');
    doc.font('Helvetica').fontSize(7).fillColor('#6b7280')
      .text(`Folio: ${folio(rev.id)}  |  Revision: ${fmtFull(rev.fecha_revision)}  |  Auditor: ${rev.auditor_nombre || '—'}`, COL1, footY + 4, { align: 'center', width: 495 });
    doc.text('Sistema de Control de Herramienta — Cadena Comercial OXXO, S.A. DE C.V.', { align: 'center', width: 495 });

    doc.end();
  });
}

function buildEquipoPDF(rev, equipo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Carta Responsiva Equipo - ${folio(rev.id)}` } });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const emp = rev.empleado_snapshot || {};
    const snap = equipo.herramienta_snapshot || {};
    const plaza = emp.plaza || '—';
    const nombreEmp = emp.nombre_completo || rev.nombre_completo || '—';
    const puesto = emp.posicion || '—';
    const ciudad = rev._ciudad || '';

    const COL1 = 50, COL2 = 220, COL3 = 390;
    const SIGW = 140, SIGH = 55;

    // ── Header ───────────────────────────────────────────────────────────────
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

    // ── Fecha ────────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(9)
      .text(`${ciudad ? ciudad + ', a ' : ''}${fmtDate(rev.fecha_revision)}`, { align: 'right' });
    doc.moveDown(0.5);

    // ── Cuerpo ───────────────────────────────────────────────────────────────
    const marca = equipo.marca || snap.marca || '—';
    const modelo = equipo.modelo || snap.modelo || '—';
    const desc = [marca, modelo].filter(Boolean).join(' ');

    doc.font('Helvetica').fontSize(10).text('Hago entrega para uso laboral de Laptop ', { continued: true })
      .font('Helvetica-Bold').text(desc, { continued: true })
      .font('Helvetica').text(`, al servicio de CADENA COMERCIAL OXXO, S.A. DE C.V.`, { align: 'justify' });
    doc.moveDown(0.5);

    // ── Datos del equipo ─────────────────────────────────────────────────────
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

    // ── Daños ────────────────────────────────────────────────────────────────
    const danos = Array.isArray(equipo.danos) ? equipo.danos : [];
    if (danos.length > 0) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e').text('Danos / desperfectos registrados:');
      danos.forEach(d => {
        doc.font('Helvetica').fontSize(8).fillColor('#78350f')
          .text(`  • ${d.label}${d.observacion ? ': ' + d.observacion : ''}`);
      });
      doc.fillColor('black');
    }

    if (equipo.comentarios) {
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(`Comentarios: ${equipo.comentarios}`);
      doc.fillColor('black');
    }

    // ── Firmas ───────────────────────────────────────────────────────────────
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
    [COL1, COL2, COL3].forEach(x => {
      doc.moveTo(x, lineY).lineTo(x + SIGW, lineY).strokeColor('#333').stroke();
    });
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
  });
}

// Sanitize employee name for filename
function safeFilename(name) {
  return (name || 'Empleado').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_').slice(0, 60);
}

router.get('/auto', requireExportAccess, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let q = `SELECT r.id, r.fecha_revision, r.auditor_nombre, r.empleado_snapshot, r.tiene_auto,
              ra.no_modelo, ra.no_serie, ra.placas, ra.codigo_barras, ra.kilometraje,
              ra.poliza_seguro, ra.licencia_numero, ra.llanta_refaccion, ra.gato_cruceta,
              ra.tarjeta_circulacion, ra.comentarios, ra.danos,
              ra.firma_empleado, ra.firma_auditor, ra.firma_responsable_rh, ra.nombre_responsable_rh,
              ra.domicilio, ra.herramienta_snapshot,
              cfg.value as ciudad
             FROM revisiones r
             JOIN revision_auto ra ON ra.revision_id = r.id
             LEFT JOIN app_config cfg ON cfg.key = 'ciudad_revision'
             WHERE r.tiene_auto = true`;
    const params = [];
    if (desde) { params.push(desde); q += ` AND r.fecha_revision >= $${params.length}`; }
    if (hasta) { params.push(hasta); q += ` AND r.fecha_revision <= $${params.length}`; }
    q += ' ORDER BY r.fecha_revision DESC';

    const { rows } = await pool.query(q, params);
    if (rows.length === 0) return res.status(404).json({ error: 'No hay revisiones con automovil en el rango indicado' });

    // Build all PDFs in memory first
    const pdfs = [];
    for (const row of rows) {
      const rev = {
        id: row.id,
        fecha_revision: row.fecha_revision,
        auditor_nombre: row.auditor_nombre,
        empleado_snapshot: row.empleado_snapshot || {},
        _ciudad: row.ciudad || '',
      };
      const auto = {
        no_modelo: row.no_modelo, no_serie: row.no_serie, placas: row.placas,
        codigo_barras: row.codigo_barras, kilometraje: row.kilometraje,
        poliza_seguro: row.poliza_seguro, licencia_numero: row.licencia_numero,
        llanta_refaccion: row.llanta_refaccion, gato_cruceta: row.gato_cruceta,
        tarjeta_circulacion: row.tarjeta_circulacion,
        comentarios: row.comentarios, danos: row.danos || [],
        firma_empleado: row.firma_empleado, firma_auditor: row.firma_auditor,
        firma_responsable_rh: row.firma_responsable_rh, nombre_responsable_rh: row.nombre_responsable_rh,
        domicilio: row.domicilio, herramienta_snapshot: row.herramienta_snapshot || {},
      };
      const pdfBuf = await buildAutoPDF(rev, auto);
      const empName = safeFilename((row.empleado_snapshot || {}).nombre_completo || '');
      pdfs.push({ buf: pdfBuf, name: `${empName}_${folio(row.id)}.pdf` });
    }

    // Generate ZIP in memory
    const archive = archiver('zip', { zlib: { level: 6 } });
    const zipChunks = [];
    archive.on('data', c => zipChunks.push(c));
    await new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
      for (const { buf, name } of pdfs) archive.append(buf, { name });
      archive.finalize();
    });
    const zipBuf = Buffer.concat(zipChunks);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="SICHE_Responsivas_Auto_${new Date().toISOString().slice(0,10)}.zip"`);
    res.setHeader('Content-Length', zipBuf.length);
    res.send(zipBuf);
  } catch (e) {
    console.error('Error exportar responsivas auto:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar archivo' });
  }
});

router.get('/equipo', requireExportAccess, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let q = `SELECT r.id, r.fecha_revision, r.auditor_nombre, r.empleado_snapshot, r.tiene_equipo,
              re.codigo_barras, re.marca, re.modelo, re.serie, re.comentarios, re.danos,
              re.firma_empleado, re.firma_auditor, re.firma_responsable_rh, re.nombre_responsable_rh,
              re.herramienta_snapshot,
              cfg.value as ciudad
             FROM revisiones r
             JOIN revision_equipo re ON re.revision_id = r.id
             LEFT JOIN app_config cfg ON cfg.key = 'ciudad_revision'
             WHERE r.tiene_equipo = true`;
    const params = [];
    if (desde) { params.push(desde); q += ` AND r.fecha_revision >= $${params.length}`; }
    if (hasta) { params.push(hasta); q += ` AND r.fecha_revision <= $${params.length}`; }
    q += ' ORDER BY r.fecha_revision DESC';

    const { rows } = await pool.query(q, params);
    if (rows.length === 0) return res.status(404).json({ error: 'No hay revisiones con equipo en el rango indicado' });

    // Build all PDFs in memory first
    const pdfs = [];
    for (const row of rows) {
      const rev = {
        id: row.id,
        fecha_revision: row.fecha_revision,
        auditor_nombre: row.auditor_nombre,
        empleado_snapshot: row.empleado_snapshot || {},
        _ciudad: row.ciudad || '',
      };
      const equipo = {
        codigo_barras: row.codigo_barras, marca: row.marca, modelo: row.modelo, serie: row.serie,
        comentarios: row.comentarios, danos: row.danos || [],
        firma_empleado: row.firma_empleado, firma_auditor: row.firma_auditor,
        firma_responsable_rh: row.firma_responsable_rh, nombre_responsable_rh: row.nombre_responsable_rh,
        herramienta_snapshot: row.herramienta_snapshot || {},
      };
      const pdfBuf = await buildEquipoPDF(rev, equipo);
      const empName = safeFilename((row.empleado_snapshot || {}).nombre_completo || '');
      pdfs.push({ buf: pdfBuf, name: `${empName}_${folio(row.id)}.pdf` });
    }

    // Generate ZIP in memory
    const archive = archiver('zip', { zlib: { level: 6 } });
    const zipChunks = [];
    archive.on('data', c => zipChunks.push(c));
    await new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
      for (const { buf, name } of pdfs) archive.append(buf, { name });
      archive.finalize();
    });
    const zipBuf = Buffer.concat(zipChunks);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="SICHE_Responsivas_Equipo_${new Date().toISOString().slice(0,10)}.zip"`);
    res.setHeader('Content-Length', zipBuf.length);
    res.send(zipBuf);
  } catch (e) {
    console.error('Error exportar responsivas equipo:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar archivo' });
  }
});

module.exports = router;
