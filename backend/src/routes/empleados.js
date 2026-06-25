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
      `SELECT id, numero_empleado, nombre_completo, posicion, departamento, plaza, region
       FROM empleados
       WHERE is_active=true AND (
         numero_empleado ILIKE $1 OR
         UPPER(nombre_completo) LIKE $1
       )
       ORDER BY nombre_completo LIMIT 20`,
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

module.exports = router;
