try { require('dotenv').config(); } catch {}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const { requireAuth } = require('./middleware/auth');

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

app.get('/api/config', requireAuth, async (req, res) => {
  const pool = require('./db');
  try {
    const { rows } = await pool.query('SELECT key,value FROM app_config');
    const config = {};
    rows.forEach(r => { try { config[r.key] = JSON.parse(r.value); } catch { config[r.key] = r.value; } });
    res.json(config);
  } catch { res.status(500).json({ error: 'Error interno del servidor' }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/version', (req, res) => res.json({ version: '2.1.0' }));

// Verificación pública de documentos (sin auth)
app.get('/api/verificar/:id', async (req, res) => {
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
