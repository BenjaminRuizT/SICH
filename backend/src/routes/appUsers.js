const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT id,username,nombre,rol,is_active,last_login,created_at FROM app_users ORDER BY nombre');
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { username, password, nombre, rol } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO app_users(username,password_hash,nombre,rol) VALUES($1,$2,$3,$4) RETURNING id,username,nombre,rol',
      [username, hash, nombre, rol]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { nombre, rol, is_active, password } = req.body;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    }
    const { rows } = await pool.query(
      'UPDATE app_users SET nombre=COALESCE($1,nombre),rol=COALESCE($2,rol),is_active=COALESCE($3,is_active) WHERE id=$4 RETURNING id,username,nombre,rol,is_active',
      [nombre, rol, is_active, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query('UPDATE app_users SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
