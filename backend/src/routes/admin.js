const router = require('express').Router();
const pool = require('../db');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const ExcelJS = require('exceljs');

// ---------------------------------------------------------------------------
// Templates descargables
// ---------------------------------------------------------------------------

router.get('/template/:tipo', requireAdmin, async (req, res) => {
  const { tipo } = req.params;
  const wb = new ExcelJS.Workbook();

  if (tipo === 'empleados') {
    const ws = wb.addWorksheet('Empleados');
    ws.columns = [
      { header: 'numero_empleado', key: 'numero_empleado', width: 20 },
      { header: 'nombre_completo',  key: 'nombre_completo',  width: 35 },
      { header: 'posicion',         key: 'posicion',         width: 30 },
      { header: 'departamento',     key: 'departamento',     width: 25 },
      { header: 'plaza',            key: 'plaza',            width: 20 },
      { header: 'region',           key: 'region',           width: 15 },
    ];
    ws.addRow({ numero_empleado: '87090', nombre_completo: 'Guadalupe Barrera Verdugo',
      posicion: 'ANALISTA ADMINISTRACION PERSONAL', departamento: 'ADMON PERSONAL',
      plaza: 'Región', region: 'Tijuana' });
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  } else if (tipo === 'herramientas') {
    const ws = wb.addWorksheet('Herramientas');
    ws.columns = [
      { header: 'tipo',                    key: 'tipo',                    width: 12 },
      { header: 'codigo_barras',           key: 'codigo_barras',           width: 15 },
      { header: 'no_activo',               key: 'no_activo',               width: 12 },
      { header: 'marca',                   key: 'marca',                   width: 15 },
      { header: 'modelo',                  key: 'modelo',                  width: 20 },
      { header: 'anio',                    key: 'anio',                    width: 8 },
      { header: 'serie',                   key: 'serie',                   width: 20 },
      { header: 'plaza',                   key: 'plaza',                   width: 20 },
      { header: 'asignado_a_raw',          key: 'asignado_a_raw',          width: 35 },
      { header: 'numero_empleado_asignado',key: 'numero_empleado_asignado',width: 22 },
    ];
    ws.addRow({ tipo: 'laptop', codigo_barras: '03539250', no_activo: '7039012',
      marca: 'HP', modelo: '840G8', anio: 2021, serie: '5CG1384XC3',
      plaza: 'Tijuana Este', asignado_a_raw: 'JESUS MIGUEL CORREA DE LA TORRE',
      numero_empleado_asignado: '87090' });
    ws.addRow({ tipo: 'auto', codigo_barras: '04842802', no_activo: '8467096',
      marca: 'Chevrolet', modelo: 'Aveo', anio: 2025, serie: 'LZWPRMGN8SF110272',
      plaza: 'Tijuana Este', asignado_a_raw: 'MARIA GUADALUPE CARDOSO PALACIOS',
      numero_empleado_asignado: '' });
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };

    // Nota de tipos válidos
    const noteRow = ws.addRow(['']);
    ws.addRow(['* tipo: auto | laptop | computo']);
    ws.addRow(['* plaza: Región | Tijuana Centro | Tijuana Este | Playas | Ensenada | Oficinas Región']);
    ws.getRow(ws.lastRow.number).font = { italic: true, color: { argb: 'FF666666' } };
  } else {
    return res.status(400).json({ error: 'tipo inválido (empleados|herramientas)' });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="template_${tipo}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// ---------------------------------------------------------------------------
// Import desde Excel (base64 en body)
// ---------------------------------------------------------------------------

router.post('/import-excel/:tipo', requireAdmin, async (req, res) => {
  const { tipo } = req.params;
  const { data } = req.body; // base64 string
  if (!data) return res.status(400).json({ error: 'Falta campo data (base64)' });

  const buf = Buffer.from(data, 'base64');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  // Leer cabeceras
  const headers = [];
  ws.getRow(1).eachCell(cell => headers.push(String(cell.value || '').trim().toLowerCase()));

  const rows = [];
  ws.eachRow((row, idx) => {
    if (idx === 1) return;
    const obj = {};
    row.eachCell((cell, col) => {
      const key = headers[col - 1];
      if (key) obj[key] = cell.value === null || cell.value === undefined ? '' : String(cell.value).trim();
    });
    if (Object.values(obj).some(v => v)) rows.push(obj);
  });

  if (tipo === 'empleados') {
    let inserted = 0, updated = 0;
    for (const row of rows) {
      const { numero_empleado, nombre_completo, posicion, departamento, plaza, region } = row;
      if (!numero_empleado || !nombre_completo) continue;
      await pool.query(
        `INSERT INTO empleados(numero_empleado,nombre_completo,posicion,departamento,plaza,region)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(numero_empleado) DO UPDATE SET
           nombre_completo=EXCLUDED.nombre_completo, posicion=EXCLUDED.posicion,
           departamento=EXCLUDED.departamento, plaza=EXCLUDED.plaza, updated_at=NOW()`,
        [numero_empleado, nombre_completo, posicion, departamento, plaza, region || 'Tijuana']
      );
      inserted++;
    }
    return res.json({ ok: true, inserted, updated, total: rows.length });
  }

  if (tipo === 'herramientas') {
    let count = 0;
    for (const row of rows) {
      const { tipo: t, codigo_barras, no_activo, marca, modelo, anio, serie,
              plaza, asignado_a_raw, numero_empleado_asignado } = row;
      if (!t || !['auto', 'laptop', 'computo'].includes(t)) continue;

      let empId = null;
      if (numero_empleado_asignado) {
        const { rows: er } = await pool.query('SELECT id FROM empleados WHERE numero_empleado=$1 LIMIT 1', [numero_empleado_asignado]);
        if (er[0]) empId = er[0].id;
      }

      await pool.query(
        `INSERT INTO herramientas(tipo,codigo_barras,no_activo,marca,modelo,anio,serie,plaza,empleado_id,asignado_a_raw)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [t, codigo_barras || null, no_activo || null, marca || null, modelo || null,
         anio ? parseInt(anio) || null : null, serie || null, plaza || null, empId, asignado_a_raw || null]
      );
      if (empId && no_activo) {
        await pool.query(
          `UPDATE herramientas SET empleado_id=$1 WHERE no_activo=$2 AND empleado_id IS NULL`,
          [empId, no_activo]
        );
      }
      count++;
    }
    return res.json({ ok: true, count, total: rows.length });
  }

  res.status(400).json({ error: 'tipo inválido' });
});

// ---------------------------------------------------------------------------
// Catálogo de herramientas (lista + detalle)
// ---------------------------------------------------------------------------

router.get('/herramientas', requireAdmin, async (req, res) => {
  try {
    const { tipo, plaza, sin_revision } = req.query;
    let q = `
      SELECT h.id, h.tipo, h.codigo_barras, h.no_activo, h.marca, h.modelo, h.anio,
             h.plaza, h.asignado_a_raw, h.serie,
             e.nombre_completo AS empleado_nombre, e.numero_empleado,
             CASE WHEN ra.herramienta_id IS NOT NULL OR re.herramienta_id IS NOT NULL
                  THEN true ELSE false END AS tiene_revision
      FROM herramientas h
      LEFT JOIN empleados e ON h.empleado_id = e.id
      LEFT JOIN revision_auto ra ON ra.herramienta_id = h.id
      LEFT JOIN revision_equipo re ON re.herramienta_id = h.id
      WHERE h.is_active = true`;
    const params = [];
    if (tipo) { params.push(tipo); q += ` AND h.tipo=$${params.length}`; }
    if (plaza) { params.push(plaza); q += ` AND h.plaza=$${params.length}`; }
    q += ' GROUP BY h.id, e.nombre_completo, e.numero_empleado, ra.herramienta_id, re.herramienta_id';
    if (sin_revision === '1') q += ' HAVING ra.herramienta_id IS NULL AND re.herramienta_id IS NULL';
    q += ' ORDER BY h.tipo, h.plaza, h.codigo_barras';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/herramientas/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: [h] } = await pool.query(
      `SELECT h.*, e.nombre_completo AS empleado_nombre, e.numero_empleado
       FROM herramientas h LEFT JOIN empleados e ON h.empleado_id=e.id
       WHERE h.id=$1`, [req.params.id]);
    if (!h) return res.status(404).json({ error: 'No encontrada' });

    const { rows: revs } = await pool.query(
      `SELECT r.id, r.fecha_revision, r.auditor_nombre,
              'auto' AS tipo
       FROM revisiones r JOIN revision_auto ra ON ra.revision_id=r.id
       WHERE ra.herramienta_id=$1
       UNION ALL
       SELECT r.id, r.fecha_revision, r.auditor_nombre,
              'equipo' AS tipo
       FROM revisiones r JOIN revision_equipo re ON re.revision_id=r.id
       WHERE re.herramienta_id=$1
       ORDER BY fecha_revision DESC`, [req.params.id]);

    res.json({ ...h, revisiones: revs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Herramientas sin revisión
// ---------------------------------------------------------------------------

router.get('/sin-validar', requireAdmin, async (req, res) => {
  try {
    const { tipo, plaza } = req.query;
    let q = `
      SELECT h.id, h.tipo, h.codigo_barras, h.no_activo, h.marca, h.modelo, h.anio,
             h.plaza, h.asignado_a_raw, h.empleado_id,
             e.nombre_completo as empleado_nombre, e.numero_empleado
      FROM herramientas h
      LEFT JOIN empleados e ON h.empleado_id = e.id
      WHERE h.is_active = true
        AND h.id NOT IN (
          SELECT herramienta_id FROM revision_auto WHERE herramienta_id IS NOT NULL
          UNION
          SELECT herramienta_id FROM revision_equipo WHERE herramienta_id IS NOT NULL
        )`;
    const params = [];
    if (tipo) { params.push(tipo); q += ` AND h.tipo=$${params.length}`; }
    if (plaza) { params.push(plaza); q += ` AND h.plaza=$${params.length}`; }
    q += ' ORDER BY h.tipo, h.plaza, e.nombre_completo NULLS LAST';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Configuración de aplicación
// ---------------------------------------------------------------------------

router.get('/config', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM app_config');
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    res.json(cfg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/config', requireAdmin, async (req, res) => {
  try {
    const numericKeys = ['inactivity_minutes'];
    const stringKeys = ['nombre_responsable_rh', 'firma_responsable_rh'];
    const allowed = [...numericKeys, ...stringKeys];
    const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));

    for (const [key, value] of updates) {
      let storedValue;
      if (numericKeys.includes(key)) {
        const parsed = parseInt(value);
        if (isNaN(parsed) || parsed < 1 || parsed > 480)
          return res.status(400).json({ error: `Valor inválido para ${key}` });
        storedValue = String(parsed);
      } else {
        storedValue = String(value ?? '');
      }
      await pool.query(
        `INSERT INTO app_config(key, value) VALUES($1, $2)
         ON CONFLICT (key) DO UPDATE SET value=$2`,
        [key, storedValue]
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------------------------------------------------------
// Reset de aplicación
// ---------------------------------------------------------------------------

router.post('/reset', requireAdmin, async (req, res) => {
  const {
    keep_historial = false,
    keep_herramientas = false,
    keep_empleados = false,
    limpiar_fotos = true,
  } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!keep_historial) {
      await client.query('DELETE FROM revision_auto');
      await client.query('DELETE FROM revision_equipo');
      await client.query('DELETE FROM revisiones');
    } else if (limpiar_fotos) {
      // Conserva registros pero elimina todo el contenido binario (fotos y firmas)
      await client.query(`
        UPDATE revision_auto SET
          foto_condiciones      = '[]',
          foto_licencia         = NULL,
          foto_licencia_reverso = NULL,
          foto_tarjeta_circulacion = NULL,
          foto_poliza_seguro    = NULL,
          firma_empleado        = NULL,
          firma_auditor         = NULL,
          firma_responsable_rh  = NULL
      `);
      await client.query(`
        UPDATE revision_equipo SET
          foto_equipo          = NULL,
          firma_empleado       = NULL,
          firma_auditor        = NULL,
          firma_responsable_rh = NULL
      `);
    }
    if (!keep_herramientas) {
      await client.query('DELETE FROM herramientas');
    }
    if (!keep_empleados && !keep_herramientas) {
      await client.query('DELETE FROM empleados');
    }
    await client.query('COMMIT');

    const [r, h, e] = await Promise.all([
      client.query('SELECT COUNT(*) FROM revisiones'),
      client.query('SELECT COUNT(*) FROM herramientas'),
      client.query('SELECT COUNT(*) FROM empleados'),
    ]);
    res.json({
      ok: true,
      remaining: {
        revisiones: parseInt(r.rows[0].count),
        herramientas: parseInt(h.rows[0].count),
        empleados: parseInt(e.rows[0].count),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /reset:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally { client.release(); }
});

module.exports = router;
