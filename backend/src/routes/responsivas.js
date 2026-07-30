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
let femsaLogoBuffer = null;
try {
  const p = path.join(__dirname, '../../frontend/public/oxxo.png');
  if (fs.existsSync(p)) oxxoLogoBuffer = fs.readFileSync(p);
} catch {}
try {
  const p = path.join(__dirname, '../../frontend/public/femsa.png');
  if (fs.existsSync(p)) femsaLogoBuffer = fs.readFileSync(p);
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

      const emp  = rev.empleado_snapshot || {};
      const snap = (auto.herramienta_snapshot && typeof auto.herramienta_snapshot === 'object') ? auto.herramienta_snapshot : {};
      const L = 50, W = 495, PH = doc.page.height, PM = 50;

      const nombreEmp = emp.nombre_completo || '_________________________';
      const puesto    = emp.posicion       || '_________________________';
      const plaza     = emp.plaza          || '_________________________';
      const marca     = snap.marca         || '';
      const modelo    = auto.no_modelo     || snap.modelo || '_________________________';
      const anio      = snap.anio          || '_____';
      const serie     = auto.no_serie      || snap.serie  || '_________________________';
      const placas    = auto.placas        || '—';
      const domicilio = auto.domicilio     || '________________________________';
      const cp        = auto.codigo_postal || '______';
      const fol       = folio(rev.id);
      const fecha     = fmtDate(rev.fecha_revision);

      function drawCartaAutoHeader(hoja) {
        const y0 = doc.y;
        const LOGO_W = 110, TITLE_W = 170, C_W = 110, F_W = 105;
        const xLogo = L, xTitle = L + LOGO_W, xCode = xTitle + TITLE_W, xFlio = xCode + C_W;
        const H = 18;

        doc.rect(xLogo, y0, LOGO_W, H * 3).stroke('#555');
        if (femsaLogoBuffer) {
          try { doc.image(femsaLogoBuffer, xLogo + 5, y0 + 4, { fit: [LOGO_W - 10, H * 3 - 8] }); } catch {}
        } else {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#c00')
            .text('FEMSA\nComercio', xLogo + 4, y0 + H, { width: LOGO_W - 8, align: 'center' });
          doc.fillColor('black');
        }

        doc.rect(xTitle, y0, TITLE_W, H).stroke('#555');
        doc.font('Helvetica').fontSize(7).text('FORMATO', xTitle + 2, y0 + 4, { width: TITLE_W - 4, align: 'center' });
        doc.rect(xCode, y0, C_W, H).stroke('#555');
        doc.font('Helvetica').fontSize(7).text('CÓDIGO: OYC', xCode + 2, y0 + 4, { width: C_W - 4 });
        doc.rect(xFlio, y0, F_W, H).stroke('#555');
        doc.font('Helvetica').fontSize(7).text(`FOLIO: ${fol}`, xFlio + 2, y0 + 4, { width: F_W - 4 });

        const y2 = y0 + H;
        doc.rect(xTitle, y2, TITLE_W, H * 2).stroke('#555');
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#cc0000')
          .text('CARTA COMPROMISO', xTitle + 2, y2 + 7, { width: TITLE_W - 4, align: 'center' });
        doc.fillColor('black');
        doc.rect(xCode, y2, C_W + F_W, H).stroke('#555');
        doc.font('Helvetica').fontSize(6.5).text('REVISIÓN: 01.  ELABORADO: 09/May/03', xCode + 2, y2 + 4, { width: C_W + F_W - 4 });

        const y3 = y2 + H;
        doc.rect(xCode, y3, C_W, H).stroke('#555');
        doc.font('Helvetica').fontSize(6.5).text(`Fecha: ${fecha}`, xCode + 2, y3 + 4, { width: C_W - 4 });
        doc.rect(xFlio, y3, F_W, H).stroke('#555');
        doc.font('Helvetica').fontSize(6.5).text(`Hoja ${hoja} de 2`, xFlio + 2, y3 + 4, { width: F_W - 4, align: 'center' });

        doc.y = y0 + H * 3 + 10;
        doc.strokeColor('black').fillColor('black').font('Helvetica');
      }

      function drawAuthTable(y) {
        const cw = W / 3;
        const H1 = 15;
        [
          ['AUTORIZACION', 'OXXO | Uso Interno', ''],
          ['RESPONSABLE', 'AUTORIZA', 'AUTORIZA'],
          ['ORGANIZACIÓN Y COMPENSACIONES', 'DIRECTOR GENERAL', 'DIRECTOR RECURSOS HUMANOS'],
        ].forEach((row, ri) => {
          row.forEach((text, ci) => {
            const rx = L + ci * cw, ry = y + ri * H1;
            const fill = ri === 0 ? '#e8e8e8' : 'white';
            doc.rect(rx, ry, cw, H1).fillAndStroke(fill, '#555');
            doc.font(ri < 2 ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.5).fillColor('#333')
              .text(text, rx + 2, ry + 4, { width: cw - 4, align: 'center' });
            doc.fillColor('black');
          });
        });
      }

      // ── PÁGINA 1 ────────────────────────────────────────────────────────────
      drawCartaAutoHeader('1');
      doc.font('Helvetica').fontSize(8.5).fillColor('black');

      doc.text(
        `1.1 Convenio de uso de herramienta de trabajo que celebran por una parte Cadena Comercial Oxxo a quien en lo sucesivo se le denominará "la empresa" y por la otra ${nombreEmp} con domicilio en ${domicilio} C.P ${cp}. a quien en lo sucesivo se denominará "el empleado" y manifiestan que celebran el presente al tenor de las siguientes`,
        { align: 'justify' }
      );
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(9).text('D E C L A R A C I O N E S', { align: 'center' });
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').fontSize(8.5).text('I.', { continued: true }).font('Helvetica')
        .text(' Declara que su representada es una sociedad mercantil establecida conforme a las leyes mexicanas, y que dentro de su objeto social, se establece la posibilidad de celebrar contratos y convenios.', { align: 'justify' });
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('II.', { continued: true }).font('Helvetica')
        .text(` Manifiesta que tiene celebrado contrato de trabajo con Cadena Comercial Oxxo, SA de CV y que en el cuerpo del mismo se compromete expresamente a prestar sus servicios personales a terceros y que tal es el caso que ha sido asignado a ${plaza} en el puesto de ${puesto} y que para realizar las labores inherentes a su contrato de trabajo es necesario contar con un automóvil como herramienta de trabajo.`, { align: 'justify' });
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('III.', { continued: true }).font('Helvetica')
        .text(' Ambas partes manifiestan que celebran el presente convenio al tenor de las siguientes:', { align: 'justify' });
      doc.moveDown(0.4);

      doc.font('Helvetica-Bold').fontSize(9).text('2   C L A U S U L A S', { align: 'center' });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8.5);
      doc.text(
        `"La empresa" hace entrega de un automóvil ${[marca, modelo].filter(Boolean).join(' ')} modelo ${anio} con número de serie ${serie} mismo que deberá de ser utilizado única y exclusivamente en el cumplimiento de las labores inherentes al puesto de ${puesto} que la empresa le asigne a "el empleado" previa autorización del representante legal de la misma.`,
        { align: 'justify' }
      );
      doc.moveDown(0.3);

      [
        `"La empresa" cubrirá los gastos que imponen las leyes y reglamentos tales como placas, tenencias, revisados y demás derechos o impuestos que procedan por la tenencia, uso o disfrute el automóvil. "El empleado" cubrirá todas las sanciones o multas que provengan de infracciones a reglamentos o leyes, lo mismo los gastos de grúa que se ocasionen.`,
        `La empresa comprará por su cuenta un seguro de Cobertura Total. Los daños que reciba el vehículo o gastos que se deriven de algún accidente y no estén cubiertos por alguna póliza, serán pagados por la empresa, así como los deducibles normales.`,
        `Los deducibles provenientes de accidentes en los que participe algún conductor que no tenga relación con la empresa y los daños que el seguro no cubra por falta de licencia del conductor, serán cubiertos de contado y cuando "la empresa" lo solicite a "el empleado" que tiene asignado el automóvil.`,
      ].forEach((text, i) => {
        doc.font('Helvetica-Bold').fontSize(8.5).text(`${i + 1}.`, { continued: true })
          .font('Helvetica').text(` ${text}`, { align: 'justify' });
        doc.moveDown(0.3);
      });

      drawAuthTable(PH - PM - 50);

      // ── PÁGINA 2 ────────────────────────────────────────────────────────────
      doc.addPage();
      drawCartaAutoHeader('2');
      doc.font('Helvetica').fontSize(8.5).fillColor('black');

      [
        `"El Empleado" se compromete a utilizar personalmente el automóvil que "la empresa" le hace entrega única y exclusivamente en las actividades inherentes al puesto de ${puesto} otras que la empresa le asigne, deberá de respetar siempre la imagen de "la empresa", y por ningún motivo podrá prestarlo, cederlo ó traspasarlo a otra persona sin previa autorización por escrito del representante legal de la misma.`,
        `En periodo de vacaciones el automóvil invariablemente deberá permanecer en la empresa.`,
        `"El empleado" es responsable de la operación correcta del automóvil que le ha sido asignado, el incumplimiento de las condiciones pactadas son motivo de sanción y en caso de reincidir es motivo de rescisión de contrato individual de trabajo.`,
        `"El empleado" se compromete a mantener el automóvil en perfectas condiciones, si el carro sufre cualquier siniestro, aun siendo este menor deberá ser reparado a la brevedad posible.`,
        `"La empresa" se compromete a cubrir los gastos de operación y mantenimiento del automóvil conforme a las normas y criterios establecidos en el reglamento de automóviles vigentes en la misma.`,
        `Se deberá establecer un programa de mantenimiento preventivo que asegure la operación cotidiana y alargue la vida útil del automóvil; será responsabilidad del empleado que tiene asignado el automóvil el estado y conservación del mismo, sujetándose a lo que la empresa establezca.`,
        `En caso de separarse el empleado del puesto que tenía asignado por cualquier motivo (promoción, renuncia, indemnización, etc.), deberá entregar el automóvil en perfectas condiciones de uso y operación a la empresa en la fecha de su separación.`,
        `Manifiesta el empleado que el automóvil que le ha sido asignado es herramienta de trabajo y que no forma parte integrante de sus prestaciones, por lo que en este acto acepta que en ningún momento se deberá integrar a su salario. Ambas partes firman el presente convenio de conformidad en la ciudad de ${plaza} a ${fecha}.`,
      ].forEach((text, i) => {
        doc.font('Helvetica-Bold').fontSize(8.5).text(`${i + 4}.`, { continued: true })
          .font('Helvetica').text(` ${text}`, { align: 'justify' });
        doc.moveDown(0.3);
      });

      // Datos de la unidad
      doc.moveDown(0.2);
      const dtY = doc.y;
      doc.rect(L, dtY, W, 13).fillAndStroke('#f0f0f0', '#888');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#333')
        .text('Datos de la unidad revisada:', L + 4, dtY + 3, { width: W - 8 });
      doc.fillColor('black');
      doc.y = dtY + 13;

      const yn = (v) => (v === true || v === 'true' || v === 1) ? 'Sí' : (v === false || v === 'false' || v === 0) ? 'No' : '—';
      [
        [`Marca/Modelo: ${[marca, modelo].filter(Boolean).join(' ')}`, `Año: ${snap.anio || '—'}`],
        [`No. Serie: ${serie}`, `Placas: ${placas}`],
        [`CB: ${auto.codigo_barras || '—'}`, `Km: ${auto.kilometraje != null ? auto.kilometraje + ' km' : '—'}`],
        [`Póliza seguro: ${yn(auto.poliza_seguro)}`, `Licencia: ${yn(auto.licencia_numero)}`],
        [`Llanta refacción: ${yn(auto.llanta_refaccion)}`, `Gato/Cruceta: ${yn(auto.gato_cruceta)}`],
        [`Tarjeta circulación: ${yn(auto.tarjeta_circulacion)}`, `Domicilio: ${auto.domicilio || '—'}`],
      ].forEach(([left, right]) => {
        const ry = doc.y;
        doc.font('Helvetica').fontSize(7).fillColor('#222').text(left, L + 4, ry, { width: W / 2 - 8 });
        doc.text(right, L + W / 2 + 4, ry, { width: W / 2 - 8 });
        doc.y = ry + 11;
      });

      const danos = Array.isArray(auto.danos) ? auto.danos : [];
      if (danos.length) {
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#92400e').text('Daños:');
        danos.forEach(d => doc.font('Helvetica').fontSize(7).fillColor('#78350f')
          .text(`  • ${d.label || ''}${d.observacion ? ': ' + d.observacion : ''}`));
        doc.fillColor('black');
      }
      if (auto.comentarios) {
        doc.moveDown(0.2);
        doc.font('Helvetica').fontSize(7.5).fillColor('#374151').text(`Comentarios: ${auto.comentarios}`);
        doc.fillColor('black');
      }

      // Firmas
      doc.moveDown(0.6);
      const sigY = doc.y, SIGW = W / 2 - 20, SIG_H = 50, rhX = L + W / 2 + 10;

      addSig(doc, dec(auto.firma_empleado), L, sigY, SIGW, SIG_H);
      doc.moveTo(L, sigY + SIG_H).lineTo(L + SIGW, sigY + SIG_H).stroke('#333');
      doc.font('Helvetica').fontSize(7.5).fillColor('#333')
        .text(nombreEmp, L, sigY + SIG_H + 3, { width: SIGW, align: 'center' })
        .text('Nombre y Firma del Empleado', L, sigY + SIG_H + 13, { width: SIGW, align: 'center' });

      addSig(doc, dec(auto.firma_responsable_rh), rhX, sigY, SIGW, SIG_H);
      doc.moveTo(rhX, sigY + SIG_H).lineTo(rhX + SIGW, sigY + SIG_H).stroke('#333');
      if (auto.nombre_responsable_rh)
        doc.font('Helvetica').fontSize(7.5).fillColor('#333')
          .text(auto.nombre_responsable_rh, rhX, sigY + SIG_H + 3, { width: SIGW, align: 'center' });
      doc.text('RH de la Unidad de Negocio', rhX, sigY + SIG_H + 13, { width: SIGW, align: 'center' });

      doc.y = sigY + SIG_H + 26;
      doc.fillColor('black').strokeColor('black');
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).stroke('#ccc');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(6.5).fillColor('#666')
        .text(`Folio: ${fol}  ·  Revisión: ${fmtFull(rev.fecha_revision)}  ·  Auditor: ${rev.auditor_nombre || '—'}`, { align: 'center' })
        .text('Sistema de Control de Herramienta — Cadena Comercial OXXO, S.A. DE C.V.', { align: 'center' });

      drawAuthTable(PH - PM - 50);

      doc.fillColor('black').font('Helvetica');
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

      const emp  = rev.empleado_snapshot || {};
      const snap = (equipo.herramienta_snapshot && typeof equipo.herramienta_snapshot === 'object') ? equipo.herramienta_snapshot : {};
      const L = 50, W = 495;

      const plaza     = emp.plaza          || '_________________________';
      const ciudad    = rev._ciudad        || emp.plaza || 'Tijuana, B.C.';
      const nombreEmp = emp.nombre_completo || '_________________________';
      const puesto    = emp.posicion        || '—';
      const marca     = equipo.marca  || snap.marca  || '';
      const modelo    = equipo.modelo || snap.modelo || '';
      const codigoBarras = equipo.codigo_barras || snap.codigo_barras || '—';
      const serie     = equipo.serie  || snap.serie  || '—';
      const fol       = folio(rev.id);

      // Encabezado: logo OXXO + PLAZA
      const headerY = doc.y;
      if (oxxoLogoBuffer) {
        try { doc.image(oxxoLogoBuffer, L, headerY, { width: 65, height: 32 }); } catch {}
      } else {
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#e8540c').text('OXXO', L, headerY + 4);
        doc.fillColor('black');
      }
      doc.font('Helvetica-Bold').fontSize(13).fillColor('black')
        .text(`PLAZA  ${plaza}`, L + 75, headerY + 7, { width: W - 75, align: 'center' });
      doc.y = headerY + 42;
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).stroke('#888');
      doc.strokeColor('black');
      doc.moveDown(0.8);

      // Fecha alineada a la derecha
      doc.font('Helvetica').fontSize(9)
        .text(`${ciudad}, a ${fmtDate(rev.fecha_revision)}`, L, doc.y, { width: W, align: 'right' });
      doc.moveDown(1.2);

      // Cuerpo
      const desc = [marca, modelo].filter(Boolean).join(' ') || '_________________________';
      doc.font('Helvetica').fontSize(10)
        .text('Hago entrega para uso laboral de Laptop ', { continued: true })
        .font('Helvetica-Bold').text(desc, { continued: true })
        .font('Helvetica').text(', para el buen uso y al servicio de la Compañía ')
        .font('Helvetica-Bold').text('CADENA COMERCIAL OXXO, S.A. DE C. V.', { align: 'justify' });
      doc.moveDown(1.5);

      // Datos del activo (centrado)
      doc.font('Helvetica-Bold').fontSize(10).text('NÚMERO DE ACTIVO:', L, doc.y, { width: W, align: 'center' });
      doc.font('Helvetica').fontSize(10).text(codigoBarras, L, doc.y, { width: W, align: 'center' });
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(10).text('NÚMERO DE SERIE:', L, doc.y, { width: W, align: 'center' });
      doc.font('Helvetica').fontSize(10).text(serie, L, doc.y, { width: W, align: 'center' });

      const danos = Array.isArray(equipo.danos) ? equipo.danos : [];
      if (danos.length) {
        doc.moveDown(0.8);
        doc.rect(L, doc.y, W, 12).fillAndStroke('#f9f9f9', '#ccc');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#333').text('Daños o desperfectos:', L + 4, doc.y + 2, { width: W - 8 });
        doc.fillColor('black');
        doc.y += 12;
        danos.forEach(d => doc.font('Helvetica').fontSize(8)
          .text(`  • ${d.label || ''}${d.observacion ? ': ' + d.observacion : ''}`));
      }
      if (equipo.comentarios) {
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(8).fillColor('#374151').text(`Comentarios: ${equipo.comentarios}`);
        doc.fillColor('black');
      }

      // Firmas: ENTREGA | RECIBE
      doc.moveDown(2);
      const sigLabelY = doc.y;
      const SIGW = W / 2 - 20, SIG_H = 55, rhX = L + W / 2 + 10;

      doc.font('Helvetica-Bold').fontSize(10)
        .text('ENTREGA', L, sigLabelY, { width: SIGW, align: 'center' })
        .text('RECIBE', rhX, sigLabelY, { width: SIGW, align: 'center' });

      const sigY = sigLabelY + 14;
      addSig(doc, dec(equipo.firma_responsable_rh), L, sigY, SIGW, SIG_H);
      doc.moveTo(L, sigY + SIG_H).lineTo(L + SIGW, sigY + SIG_H).stroke('#333');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('black')
        .text('RESPONSABLE DE RH', L, sigY + SIG_H + 4, { width: SIGW, align: 'center' });
      if (equipo.nombre_responsable_rh)
        doc.font('Helvetica').fontSize(8).fillColor('#444')
          .text(equipo.nombre_responsable_rh, L, sigY + SIG_H + 14, { width: SIGW, align: 'center' });

      addSig(doc, dec(equipo.firma_empleado), rhX, sigY, SIGW, SIG_H);
      doc.moveTo(rhX, sigY + SIG_H).lineTo(rhX + SIGW, sigY + SIG_H).stroke('#333');
      doc.font('Helvetica').fontSize(8.5).fillColor('black')
        .text(`Nombre: ${nombreEmp}`, rhX, sigY + SIG_H + 4, { width: SIGW, align: 'center' })
        .text(`Puesto: ${puesto}`, rhX, sigY + SIG_H + 14, { width: SIGW, align: 'center' });

      // TESTIGO centrado
      doc.y = sigY + SIG_H + 30;
      const TESTI_W = 200, testiX = L + (W - TESTI_W) / 2;
      doc.font('Helvetica-Bold').fontSize(10).text('TESTIGO', testiX, doc.y, { width: TESTI_W, align: 'center' });
      const testiY = doc.y + 14;
      addSig(doc, dec(equipo.firma_auditor), testiX, testiY, TESTI_W, 50);
      doc.moveTo(testiX, testiY + 50).lineTo(testiX + TESTI_W, testiY + 50).stroke('#333');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('black')
        .text('AUDITOR', testiX, testiY + 53, { width: TESTI_W, align: 'center' });
      if (rev.auditor_nombre)
        doc.font('Helvetica').fontSize(8).fillColor('#444')
          .text(rev.auditor_nombre, testiX, testiY + 63, { width: TESTI_W, align: 'center' });

      doc.y = testiY + 80;
      doc.fillColor('black').strokeColor('black');

      // Pie de seguridad
      doc.moveDown(0.4);
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).stroke('#ccc');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(6.5).fillColor('#666')
        .text(
          `Folio: ${fol}  ·  Generado: ${fmtFull(rev.fecha_revision)}${equipo.nombre_responsable_rh ? '  ·  RH: ' + equipo.nombre_responsable_rh : ''}`,
          { align: 'center' }
        )
        .text('Documento generado por el Sistema de Control de Herramienta — Cadena Comercial OXXO. Firmas electrónicas con validez conforme al Art. 1803 CCF.', { align: 'center' });

      doc.fillColor('black').font('Helvetica');
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
    const { PassThrough } = require('stream');
    const archive = archiver('zip', { zlib: { level: 6 } });
    const pass = new PassThrough();
    archive.pipe(pass);
    const zipChunks = [];
    pass.on('data', c => zipChunks.push(c));
    await new Promise((resolve, reject) => {
      pass.on('end', resolve);
      archive.on('error', reject);
      for (const { p, buf } of entries) archive.append(buf, { name: p });
      archive.finalize();
    });

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
