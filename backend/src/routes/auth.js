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

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verificar bloqueo activo
    const { rows: [lockRow] } = await pool.query(
      'SELECT locked_until FROM login_attempts WHERE username=$1', [username]
    );
    if (lockRow?.locked_until && new Date(lockRow.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(lockRow.locked_until) - Date.now()) / 60000);
      return res.status(423).json({ error: `Cuenta bloqueada. Intenta en ${mins} minuto(s).` });
    }

    const { rows } = await pool.query('SELECT * FROM app_users WHERE username=$1 AND is_active=true', [username]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      // Registrar intento fallido
      await pool.query(`
        INSERT INTO login_attempts (username, count, updated_at)
        VALUES ($1, 1, NOW())
        ON CONFLICT (username) DO UPDATE
          SET count = login_attempts.count + 1,
              locked_until = CASE WHEN login_attempts.count + 1 >= $2
                THEN NOW() + ($3 * interval '1 millisecond')
                ELSE NULL END,
              updated_at = NOW()
      `, [username, MAX_ATTEMPTS, LOCK_MS]);

      await pool.query(
        'INSERT INTO auth_log(username,event,ip,user_agent) VALUES($1,$2,$3,$4)',
        [username, 'login_failed', req.ip, req.headers['user-agent']]
      ).catch(() => {});

      const { rows: [updated] } = await pool.query(
        'SELECT count, locked_until FROM login_attempts WHERE username=$1', [username]
      );
      if (updated?.locked_until) {
        return res.status(423).json({ error: 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.' });
      }
      const restantes = MAX_ATTEMPTS - (updated?.count || 0);
      return res.status(401).json({
        error: `Usuario o contraseña incorrectos. ${restantes > 0 ? `${restantes} intento(s) restante(s).` : ''}`
      });
    }

    // Limpiar intentos fallidos al ingresar correctamente
    await pool.query('DELETE FROM login_attempts WHERE username=$1', [username]).catch(() => {});

    await pool.query('UPDATE app_users SET last_login=NOW() WHERE id=$1', [user.id]);
    await pool.query(
      'INSERT INTO auth_log(username,app_user_id,event,ip,user_agent) VALUES($1,$2,$3,$4,$5)',
      [username, user.id, 'login', req.ip, req.headers['user-agent']]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('siche_token', token, COOKIE_OPTS);
    res.json({ id: user.id, username: user.username, nombre: user.nombre, rol: user.rol });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.siche_token;
  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      pool.query('INSERT INTO auth_log(username,app_user_id,event,ip) VALUES($1,$2,$3,$4)',
        [user.username, user.id, 'logout', req.ip]).catch(() => {});
    } catch {}
  }
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
