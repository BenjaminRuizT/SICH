const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin, requireAuth } = require('../middleware/auth');

router.put('/me/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    if (new_password.length < 6)
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });

    const { rows: [user] } = await pool.query('SELECT password_hash FROM app_users WHERE id=$1', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
  try {
    const targetId = parseInt(req.params.id);
    if (req.user.id === targetId)
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    const { rows: [target] } = await pool.query('SELECT rol FROM app_users WHERE id=$1', [targetId]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.rol === 'admin') {
      const { rows: admins } = await pool.query("SELECT id FROM app_users WHERE rol='admin'");
      if (admins.length <= 1)
        return res.status(400).json({ error: 'No se puede eliminar el único administrador' });
    }
    await pool.query('DELETE FROM app_users WHERE id=$1', [targetId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
