const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.siche_token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Se requiere rol admin' });
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
