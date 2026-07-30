try { require('dotenv').config(); } catch {}

// Validate required secrets before starting
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or too short (minimum 32 characters). Set it in your environment variables.');
  process.exit(1);
}
const ENC_KEY = process.env.ENCRYPTION_KEY;
if (!ENC_KEY || ENC_KEY.length !== 64) {
  console.warn('WARN: ENCRYPTION_KEY not set or invalid (must be 64 hex chars = 32 bytes). Photos and signatures will be stored unencrypted.');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const { requireAuth } = require('./middleware/auth');
const { decrypt } = require('./utils/crypto');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/empleados', require('./routes/empleados'));
app.use('/api/herramientas', require('./routes/herramientas'));
app.use('/api/revisiones', require('./routes/revisiones'));
app.use('/api/usuarios', require('./routes/appUsers'));
app.use('/api/exportar', require('./routes/exportar'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/responsivas', require('./routes/responsivas'));

app.get('/api/config', requireAuth, async (req, res) => {
  const pool = require('./db');
  try {
    const { rows } = await pool.query('SELECT key,value FROM app_config');
    const config = {};
    rows.forEach(r => {
      let val;
      try { val = JSON.parse(r.value); } catch { val = r.value; }
      if (r.key === 'firma_responsable_rh') val = decrypt(String(val || '')) || val;
      config[r.key] = val;
    });
    res.json(config);
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/version', (req, res) => res.json({ version: '2.13.4' }));

// Verificación pública de documentos (sin auth) — rate limited para evitar enumeración
const verificarLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.get('/api/verificar/:id', verificarLimiter, async (req, res) => {
  const pool = require('./db');
  try {
    const { rows: [rev] } = await pool.query(
      `SELECT r.id, r.fecha_revision, r.auditor_nombre, r.tiene_auto, r.tiene_equipo,
              e.nombre_completo, e.numero_empleado, e.plaza
       FROM revisiones r LEFT JOIN empleados e ON r.empleado_id=e.id
       WHERE r.id=$1`, [req.params.id]);
    if (!rev) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(rev);
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

if (isProd) {
  const dist = path.join(__dirname, '../../frontend/dist');
  // Assets con hash (JS/CSS) → caché larga; index.html → sin caché
  app.use(express.static(dist, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

async function start() {
  if (isProd) {
    const migrate = require('./migrate');
    await migrate();
  }
  app.listen(PORT, () => console.log(`SICH backend listo en :${PORT}`));
}

start().catch(err => {
  console.error('Error fatal al iniciar SICH:', err);
  process.exit(1);
});
