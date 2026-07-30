const router = require('express').Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { encrypt, decrypt, encryptArr, decryptArr } = require('../utils/crypto');

// Crear revisión completa (wizard final step)
router.post('/', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { empleado_id, empleado_snapshot, observaciones, auto, equipo } = req.body;
    if (observaciones && observaciones.length > 2000)
      return res.status(400).json({ error: 'Observaciones no puede exceder 2000 caracteres' });
    if (auto?.comentarios && auto.comentarios.length > 1000)
      return res.status(400).json({ error: 'Comentarios del auto no puede exceder 1000 caracteres' });
    if (equipo?.comentarios && equipo.comentarios.length > 1000)
      return res.status(400).json({ error: 'Comentarios del equipo no puede exceder 1000 caracteres' });

    const firmaRhPresente = !!(auto?.firma_responsable_rh || equipo?.firma_responsable_rh);

    const revRes = await client.query(
      `INSERT INTO revisiones(empleado_id,empleado_snapshot,app_user_id,auditor_nombre,observaciones,tiene_auto,tiene_equipo,firma_rh_pendiente)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [empleado_id, JSON.stringify(empleado_snapshot), req.user.id, req.user.nombre,
       observaciones, !!auto, !!equipo, !firmaRhPresente]
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
           nombre_responsable_rh,firma_responsable_rh,
           foto_llanta_refaccion,tarjeta_circulacion)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [rev.id, auto.herramienta_id || null, JSON.stringify(auto.herramienta_snapshot || {}),
         auto.no_serie, auto.placas, auto.codigo_barras, auto.kilometraje,
         auto.poliza_seguro != null ? String(auto.poliza_seguro) : null,
         auto.licencia != null ? String(auto.licencia) : null,
         auto.llanta_refaccion,
         auto.comentarios,
         JSON.stringify(encryptArr(auto.foto_condiciones || [])),
         encrypt(auto.foto_licencia) || null,
         encrypt(auto.foto_tarjeta_circulacion) || null,
         JSON.stringify(auto.danos || []),
         encrypt(auto.firma_empleado) || null,
         encrypt(auto.firma_auditor) || null,
         auto.no_modelo || null,
         auto.gato_cruceta != null ? Boolean(auto.gato_cruceta) : null,
         encrypt(auto.foto_licencia_reverso) || null,
         encrypt(auto.foto_poliza_seguro) || null,
         auto.domicilio || null, auto.codigo_postal || null,
         auto.nombre_responsable_rh || null,
         encrypt(auto.firma_responsable_rh) || null,
         encrypt(auto.foto_llanta_refaccion) || null,
         auto.tarjeta_circulacion != null ? Boolean(auto.tarjeta_circulacion) : null]
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
         encrypt(equipo.foto_equipo) || null,
         equipo.comentarios || null,
         JSON.stringify(equipo.danos || []),
         encrypt(equipo.firma_empleado) || null,
         encrypt(equipo.firma_auditor) || null,
         equipo.nombre_responsable_rh || null,
         encrypt(equipo.firma_responsable_rh) || null]
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
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { empleado, desde, hasta } = req.query;
    const offset = (pageNum - 1) * limitNum;
    const from = `FROM revisiones r LEFT JOIN empleados e ON r.empleado_id = e.id WHERE 1=1`;
    const filterParams = [];
    let where = '';
    if (empleado) { filterParams.push(`%${empleado}%`); where += ` AND (e.nombre_completo ILIKE $${filterParams.length} OR e.numero_empleado ILIKE $${filterParams.length})`; }
    if (desde) { filterParams.push(desde); where += ` AND r.fecha_revision >= $${filterParams.length}`; }
    if (hasta) { filterParams.push(hasta); where += ` AND r.fecha_revision <= $${filterParams.length}`; }
    const selectParams = [...filterParams, limitNum, offset];
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

    // Decrypt sensitive fields before sending to client
    let autoData = autoR.rows[0] || null;
    if (autoData) {
      autoData = { ...autoData };
      autoData.foto_condiciones = decryptArr(autoData.foto_condiciones);
      autoData.foto_licencia = decrypt(autoData.foto_licencia);
      autoData.foto_tarjeta_circulacion = decrypt(autoData.foto_tarjeta_circulacion);
      autoData.foto_poliza_seguro = decrypt(autoData.foto_poliza_seguro);
      autoData.foto_licencia_reverso = decrypt(autoData.foto_licencia_reverso);
      autoData.foto_llanta_refaccion = decrypt(autoData.foto_llanta_refaccion);
      autoData.firma_empleado = decrypt(autoData.firma_empleado);
      autoData.firma_auditor = decrypt(autoData.firma_auditor);
      autoData.firma_responsable_rh = decrypt(autoData.firma_responsable_rh);
    }

    let equipoData = equipoR.rows[0] || null;
    if (equipoData) {
      equipoData = { ...equipoData };
      equipoData.foto_equipo = decrypt(equipoData.foto_equipo);
      equipoData.firma_empleado = decrypt(equipoData.firma_empleado);
      equipoData.firma_auditor = decrypt(equipoData.firma_auditor);
      equipoData.firma_responsable_rh = decrypt(equipoData.firma_responsable_rh);
    }

    res.json({ ...rev.rows[0], auto: autoData, equipo: equipoData });
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

// Eliminar revisión — solo admin o usuarios con can_reabrir_revision
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.rol === 'admin';
    if (!isAdmin) {
      const { rows: [u] } = await pool.query('SELECT can_reabrir_revision FROM app_users WHERE id=$1', [req.user.id]);
      if (!u?.can_reabrir_revision) return res.status(403).json({ error: 'Sin permiso para eliminar revisiones' });
    }
    const { rows: [rev] } = await pool.query('SELECT id FROM revisiones WHERE id=$1', [req.params.id]);
    if (!rev) return res.status(404).json({ error: 'Revisión no encontrada' });
    await pool.query('DELETE FROM revisiones WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

module.exports = router;
