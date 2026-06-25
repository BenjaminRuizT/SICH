const router = require('express').Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Herramientas asignadas a un empleado
router.get('/empleado/:empleadoId', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*, e.nombre_completo as empleado_nombre
       FROM herramientas h
       LEFT JOIN empleados e ON h.empleado_id = e.id
       WHERE h.empleado_id=$1 AND h.is_active=true
       ORDER BY h.tipo, h.marca`,
      [req.params.empleadoId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Buscar por código de barras
router.get('/cb/:cb', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM herramientas WHERE codigo_barras=$1 AND is_active=true LIMIT 1',
      [req.params.cb.trim()]
    );
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Importar herramientas desde JSON (admin)
// Acepta numero_empleado_asignado para auto-linkear a empleado por número
router.post('/import', requireAdmin, async (req, res) => {
  try {
    const { herramientas } = req.body;
    let count = 0;
    for (const h of herramientas) {
      const { tipo, codigo_barras, no_activo, marca, modelo, anio, serie,
              descripcion_maf, plaza, plaza_desc, asignado_a_raw, desc_puesto,
              empleado_id, numero_empleado_asignado } = h;

      let empId = empleado_id || null;
      if (!empId && numero_empleado_asignado) {
        const { rows } = await pool.query(
          'SELECT id FROM empleados WHERE numero_empleado=$1 LIMIT 1',
          [String(numero_empleado_asignado)]
        );
        if (rows[0]) empId = rows[0].id;
      }

      await pool.query(
        `INSERT INTO herramientas(tipo,codigo_barras,no_activo,marca,modelo,anio,serie,
           descripcion_maf,plaza,plaza_desc,empleado_id,asignado_a_raw,desc_puesto)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT DO NOTHING`,
        [tipo, codigo_barras, no_activo, marca, modelo, anio, serie,
         descripcion_maf, plaza, plaza_desc, empId, asignado_a_raw, desc_puesto]
      );
      // Actualizar empleado_id en registros ya existentes (re-import)
      if (empId && no_activo) {
        await pool.query(
          `UPDATE herramientas SET empleado_id=$1, asignado_a_raw=$2
           WHERE no_activo=$3 AND empleado_id IS NULL`,
          [empId, asignado_a_raw, no_activo]
        );
      }
      count++;
    }
    res.json({ ok: true, count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
