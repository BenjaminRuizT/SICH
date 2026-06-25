const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
};

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM app_users WHERE username=$1 AND is_active=true', [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    await pool.query('UPDATE app_users SET last_login=NOW() WHERE id=$1', [user.id]);
    await pool.query('INSERT INTO auth_log(username,app_user_id,event,ip,user_agent) VALUES($1,$2,$3,$4,$5)',
      [username, user.id, 'login', req.ip, req.headers['user-agent']]);
    const token = jwt.sign({ id: user.id, username: user.username, nombre: user.nombre, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('siche_token', token, COOKIE_OPTS);
    res.json({ id: user.id, username: user.username, nombre: user.nombre, rol: user.rol });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('siche_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies?.siche_token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const user = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    res.json({ id: user.id, username: user.username, nombre: user.nombre, rol: user.rol });
  } catch { res.status(401).json({ error: 'Sesión expirada' }); }
});

module.exports = router;
