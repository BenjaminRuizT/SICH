const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const BCRYPT_ROUNDS = 12;

function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(pw)) return 'La contraseña debe incluir al menos una letra mayúscula';
  if (!/[0-9]/.test(pw)) return 'La contraseña debe incluir al menos un número';
  return null;
}

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta en 15 minutos.' },
});

router.put('/me/password', requireAuth, passwordChangeLimiter, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    const pwError = validatePassword(new_password);
    if (pwError) return res.status(400).json({ error: pwError });

    const { rows: [user] } = await pool.query('SELECT password_hash FROM app_users WHERE id=$1', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

router.get('/', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT id,username,nombre,rol,is_active,last_login,created_at FROM app_users ORDER BY nombre');
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { username, password, nombre, rol } = req.body;
    if (!['admin', 'auditor'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await pool.query(
      'INSERT INTO app_users(username,password_hash,nombre,rol) VALUES($1,$2,$3,$4) RETURNING id,username,nombre,rol',
      [username, hash, nombre, rol]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(400).json({ error: 'Error al crear usuario' });
  }
});

router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { nombre, rol, is_active, password } = req.body;
    if (rol !== undefined && !['admin', 'auditor'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
    if (password) {
      const pwError = validatePassword(password);
      if (pwError) return res.status(400).json({ error: pwError });
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    }
    const { rows } = await pool.query(
      'UPDATE app_users SET nombre=COALESCE($1,nombre),rol=COALESCE($2,rol),is_active=COALESCE($3,is_active) WHERE id=$4 RETURNING id,username,nombre,rol,is_active',
      [nombre, rol, is_active, req.params.id]
    );
    res.json(rows[0]);
  } catch { res.status(400).json({ error: 'Error al actualizar usuario' }); }
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
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

module.exports = router;
