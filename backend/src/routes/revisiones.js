const router = require('express').Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Crear revisión completa (wizard final step)
router.post('/', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { empleado_id, empleado_snapshot, observaciones, auto, equipo } = req.body;

    const revRes = await client.query(
      `INSERT INTO revisiones(empleado_id,empleado_snapshot,app_user_id,auditor_nombre,observaciones,tiene_auto,tiene_equipo)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [empleado_id, JSON.stringify(empleado_snapshot), req.user.id, req.user.nombre,
       observaciones, !!auto, !!equipo]
    );
    const rev = revRes.rows[0];

    if (auto) {
      await client.query(
        `INSERT INTO revision_auto(revision_id,herramienta_id,herramienta_snapshot,no_serie,placas,
           codigo_barras,kilometraje,poliza_seguro,licencia_numero,llanta_refaccion,comentarios,
           foto_condiciones,foto_licencia,foto_tarjeta_circulacion,
           danos,firma_empleado,firma_auditor,
           no_modelo,gato_cruceta,foto_licencia_reverso,foto_poliza_seguro,
           domicilio,codigo_postal,
           nombre_responsable_rh,firma_responsable_rh)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
        [rev.id, auto.herramienta_id || null, JSON.stringify(auto.herramienta_snapshot || {}),
         auto.no_serie, auto.placas, auto.codigo_barras, auto.kilometraje,
         auto.poliza_seguro != null ? String(auto.poliza_seguro) : null,
         auto.licencia != null ? String(auto.licencia) : null,
         auto.llanta_refaccion,
         auto.comentarios, JSON.stringify(auto.foto_condiciones || []),
         auto.foto_licencia || null, auto.foto_tarjeta_circulacion || null,
         JSON.stringify(auto.danos || []),
         auto.firma_empleado || null, auto.firma_auditor || null,
         auto.no_modelo || null, auto.gato_cruceta != null ? Boolean(auto.gato_cruceta) : null,
         auto.foto_licencia_reverso || null, auto.foto_poliza_seguro || null,
         auto.domicilio || null, auto.codigo_postal || null,
         auto.nombre_responsable_rh || null, auto.firma_responsable_rh || null]
      );
    }

    if (equipo) {
      await client.query(
        `INSERT INTO revision_equipo(revision_id,herramienta_id,herramienta_snapshot,
           codigo_barras,marca,modelo,serie,foto_equipo,comentarios,
           danos,firma_empleado,firma_auditor,
           nombre_responsable_rh,firma_responsable_rh)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [rev.id, equipo.herramienta_id || null, JSON.stringify(equipo.herramienta_snapshot || {}),
         equipo.codigo_barras, equipo.marca, equipo.modelo, equipo.serie,
         equipo.foto_equipo || null, equipo.comentarios || null,
         JSON.stringify(equipo.danos || []),
         equipo.firma_empleado || null, equipo.firma_auditor || null,
         equipo.nombre_responsable_rh || null, equipo.firma_responsable_rh || null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ok: true, id: rev.id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /revisiones:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally { client.release(); }
});

// Listar revisiones
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, empleado, desde, hasta } = req.query;
    const offset = (page - 1) * limit;
    const from = `FROM revisiones r LEFT JOIN empleados e ON r.empleado_id = e.id WHERE 1=1`;
    const filterParams = [];
    let where = '';
    if (empleado) { filterParams.push(`%${empleado}%`); where += ` AND (e.nombre_completo ILIKE $${filterParams.length} OR e.numero_empleado ILIKE $${filterParams.length})`; }
    if (desde) { filterParams.push(desde); where += ` AND r.fecha_revision >= $${filterParams.length}`; }
    if (hasta) { filterParams.push(hasta); where += ` AND r.fecha_revision <= $${filterParams.length}`; }
    const selectParams = [...filterParams, limit, offset];
    const q = `SELECT r.id, r.fecha_revision, r.auditor_nombre, r.tiene_auto, r.tiene_equipo, r.status,
              e.nombre_completo, e.numero_empleado, e.plaza
             ${from}${where} ORDER BY r.fecha_revision DESC LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`;
    const { rows } = await pool.query(q, selectParams);
    const count = await pool.query(`SELECT COUNT(*) ${from}${where}`, filterParams);
    res.json({ rows, total: parseInt(count.rows[0].count) });
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

// Detalle revisión (incluyendo firmas y daños para carta responsiva)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const rev = await pool.query(
      `SELECT r.*, e.nombre_completo, e.numero_empleado
       FROM revisiones r LEFT JOIN empleados e ON r.empleado_id=e.id
       WHERE r.id=$1`, [req.params.id]);
    if (!rev.rows[0]) return res.status(404).json({ error: 'No encontrada' });
    const autoR = await pool.query('SELECT * FROM revision_auto WHERE revision_id=$1', [req.params.id]);
    const equipoR = await pool.query('SELECT * FROM revision_equipo WHERE revision_id=$1', [req.params.id]);
    res.json({ ...rev.rows[0], auto: autoR.rows[0] || null, equipo: equipoR.rows[0] || null });
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

module.exports = router;
