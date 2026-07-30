const router = require('express').Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Buscar empleados (por número, nombre o apellido)
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    const term = `%${q.trim().toUpperCase()}%`;
    const { rows } = await pool.query(
      `SELECT e.id, e.numero_empleado, e.nombre_completo, e.posicion, e.departamento, e.plaza, e.region,
              COUNT(r.id)::int AS revision_count,
              MAX(r.fecha_revision) AS ultima_revision
       FROM empleados e
       LEFT JOIN revisiones r ON r.empleado_id = e.id
       WHERE e.is_active=true AND (
         e.numero_empleado ILIKE $1 OR
         UPPER(e.nombre_completo) LIKE $1
       )
       GROUP BY e.id
       ORDER BY e.nombre_completo LIMIT 20`,
      [term]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener empleado por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM empleados WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Actualizar empleado (corregir datos en el momento de la revisión)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { nombre_completo, posicion, departamento, plaza } = req.body;
    const { rows } = await pool.query(
      `UPDATE empleados SET nombre_completo=COALESCE($1,nombre_completo),
       posicion=COALESCE($2,posicion), departamento=COALESCE($3,departamento),
       plaza=COALESCE($4,plaza), updated_at=NOW() WHERE id=$5 RETURNING *`,
      [nombre_completo, posicion, departamento, plaza, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Listar todos (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search, plaza, departamento } = req.query;
    let q = 'SELECT * FROM empleados WHERE is_active=true';
    const params = [];
    if (search) { params.push(`%${search}%`); q += ` AND (numero_empleado ILIKE $${params.length} OR nombre_completo ILIKE $${params.length})`; }
    if (plaza) { params.push(plaza); q += ` AND plaza=$${params.length}`; }
    if (departamento) { params.push(departamento); q += ` AND departamento=$${params.length}`; }
    q += ' ORDER BY nombre_completo LIMIT 1000';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Importar empleados desde JSON (admin)
router.post('/import', requireAdmin, async (req, res) => {
  try {
    const { empleados } = req.body;
    let inserted = 0, updated = 0;
    for (const emp of empleados) {
      const { numero_empleado, nombre_completo, posicion, departamento, plaza, region } = emp;
      const { rowCount } = await pool.query(
        `INSERT INTO empleados(numero_empleado,nombre_completo,posicion,departamento,plaza,region)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(numero_empleado) DO UPDATE SET
           nombre_completo=EXCLUDED.nombre_completo, posicion=EXCLUDED.posicion,
           departamento=EXCLUDED.departamento, plaza=EXCLUDED.plaza, updated_at=NOW()`,
        [String(numero_empleado), nombre_completo, posicion, departamento, plaza, region || 'Tijuana']
      );
      if (rowCount) inserted++;
      else updated++;
    }
    res.json({ ok: true, inserted, updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Crear o encontrar empleado manualmente (auditores pueden usarlo cuando el empleado no está en el catálogo)
router.post('/manual', requireAuth, async (req, res) => {
  try {
    const { nombre_completo, numero_empleado, posicion, departamento, plaza } = req.body;
    if (!nombre_completo || !nombre_completo.trim()) return res.status(400).json({ error: 'nombre_completo requerido' });

    let rows;
    if (numero_empleado && numero_empleado.trim()) {
      const r = await pool.query(
        `INSERT INTO empleados(numero_empleado,nombre_completo,posicion,departamento,plaza,region)
         VALUES($1,$2,$3,$4,$5,'Tijuana')
         ON CONFLICT(numero_empleado) DO UPDATE SET
           nombre_completo=EXCLUDED.nombre_completo,
           posicion=COALESCE(NULLIF(EXCLUDED.posicion,''),empleados.posicion),
           departamento=COALESCE(NULLIF(EXCLUDED.departamento,''),empleados.departamento),
           plaza=COALESCE(NULLIF(EXCLUDED.plaza,''),empleados.plaza),
           updated_at=NOW()
         RETURNING *`,
        [numero_empleado.trim(), nombre_completo.trim(), posicion || '', departamento || '', plaza || '']
      );
      rows = r.rows;
    } else {
      const r = await pool.query(
        `INSERT INTO empleados(nombre_completo,posicion,departamento,plaza,region)
         VALUES($1,$2,$3,$4,'Tijuana') RETURNING *`,
        [nombre_completo.trim(), posicion || '', departamento || '', plaza || '']
      );
      rows = r.rows;
    }
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error al registrar empleado' }); }
});

module.exports = router;
