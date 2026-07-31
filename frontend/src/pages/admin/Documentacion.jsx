import { useState, useEffect } from 'react';
import axios from 'axios';

const TZ = 'America/Tijuana';
const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ });
};
const fmtDT = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ });
};

const SECTIONS = [
  { num: '01', title: 'Descripción General' },
  { num: '02', title: 'Stack Tecnológico' },
  { num: '03', title: 'Arquitectura del Sistema' },
  { num: '04', title: 'Módulos Funcionales' },
  { num: '05', title: 'Controles de Seguridad Implementados' },
  { num: '06', title: 'Autenticación y Autorización' },
  { num: '07', title: 'Endpoints de API' },
  { num: '08', title: 'Esquema de Base de Datos' },
  { num: '09', title: 'Flujo de Auditoría de Herramienta' },
  { num: '10', title: 'Configuración del Sistema' },
  { num: '11', title: 'Seguridad de la Información' },
  { num: '12', title: 'Estadísticas Actuales del Sistema' },
];

const Badge = ({ color, children }) => {
  const map = {
    green:  'bg-green-50 text-green-700 border border-green-200',
    amber:  'bg-amber-50 text-amber-700 border border-amber-200',
    red:    'bg-red-50 text-red-700 border border-red-200',
    blue:   'bg-blue-50 text-blue-700 border border-blue-200',
    gray:   'bg-gray-100 text-gray-600 border border-gray-200',
    teal:   'bg-teal-50 text-teal-700 border border-teal-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  };
  return <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono ${map[color] || map.gray}`}>{children}</span>;
};

const Section = ({ num, title, children }) => (
  <section id={`sec-${String(num).padStart(2, '0')}`} className="print-section mb-10 scroll-mt-6">
    <div className="flex items-baseline gap-3 mb-4 pb-2 border-b-2 border-[#134e4a]">
      <span className="text-xs font-mono font-bold text-[#134e4a] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
        {String(num).padStart(2, '0')}
      </span>
      <h2 className="text-base font-bold text-[#134e4a] uppercase tracking-widest">{title}</h2>
    </div>
    {children}
  </section>
);

const Table = ({ headers, rows, compact = false }) => (
  <div className="overflow-x-auto">
    <table className={`w-full text-left border-collapse ${compact ? 'text-[11px]' : 'text-xs'}`}>
      <thead>
        <tr className="bg-[#134e4a] text-white">
          {headers.map((h, i) => (
            <th key={i} className="px-3 py-2 font-semibold border border-[#0d3531] whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-teal-50/40'}>
            {row.map((cell, j) => (
              <td key={j} className="px-3 py-1.5 border border-gray-200 align-top leading-relaxed">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StatCard = ({ label, value, sub }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-white">
    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</p>
    <p className="text-2xl font-bold text-[#134e4a] font-mono">{value}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default function Documentacion() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ });

  useEffect(() => {
    axios.get('/api/admin/sysinfo', { withCredentials: true })
      .then(r => setInfo(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="md:ml-56 print:ml-0 pb-16">

      {/* ── BARRA DE ACCIONES (oculta al imprimir) ── */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documentación Técnica</h1>
          <p className="text-xs text-gray-500 mt-0.5">Generado el {today} · SICH v{info?.version ?? '2.6.0'}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#134e4a] hover:bg-teal-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / Exportar PDF
        </button>
      </div>

      {/* ── DOCUMENTO ── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-0 print:rounded-none print:p-0 max-w-5xl">

        {/* ── PORTADA ── */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-4 border-[#134e4a]">
          <div className="flex items-center gap-4">
            <img src="/oxxo.png" alt="OXXO" className="h-12 object-contain" />
            <div className="border-l-2 border-gray-200 pl-4">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Cadena Comercial OXXO, S.A. de C.V.</p>
              <p className="text-[10px] text-gray-400">Uso interno — Confidencial</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-black text-[#134e4a] uppercase tracking-widest leading-tight">
              Documentación<br />Técnica del Sistema
            </h1>
            <p className="text-[11px] font-mono text-gray-500 mt-1">
              SICH v{info?.version ?? '2.6.0'} · {today}
            </p>
          </div>
        </div>

        {/* ── ÍNDICE ── */}
        <div className="mb-10 print-section">
          <div className="flex items-baseline gap-3 mb-4 pb-2 border-b-2 border-[#134e4a]">
            <span className="text-xs font-mono font-bold text-[#134e4a] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">—</span>
            <h2 className="text-base font-bold text-[#134e4a] uppercase tracking-widest">Índice de Contenidos</h2>
          </div>
          <ol className="space-y-1">
            {SECTIONS.map(({ num, title }) => (
              <li key={num}>
                <a
                  href={`#sec-${num}`}
                  onClick={e => {
                    e.preventDefault();
                    document.getElementById(`sec-${num}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="print:no-underline flex items-baseline gap-0 text-xs group hover:text-[#134e4a] text-gray-700 transition-colors"
                >
                  <span className="font-mono font-bold text-[#134e4a] w-8 shrink-0">{num}</span>
                  <span className="group-hover:underline underline-offset-2">{title}</span>
                  <span className="flex-1 border-b border-dotted border-gray-300 mx-2 mb-0.5" />
                  <span className="font-mono text-[10px] text-gray-400 shrink-0">§ {num}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* ── 01 DESCRIPCIÓN GENERAL ── */}
        <Section num={1} title="Descripción General">
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              {[
                ['Nombre del sistema', 'SICH — Sistema de Control de Herramienta'],
                ['Propósito', 'Gestión digital de auditorías de herramienta (vehículos y equipo de cómputo) asignadas a empleados'],
                ['Organización', 'Cadena Comercial OXXO, S.A. de C.V. — Zona Pacífico'],
                ['Clasificación', 'Uso interno / Confidencial'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-semibold text-gray-600 w-36 shrink-0">{k}:</span>
                  <span className="text-gray-800">{v}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                ['URL producción', 'control-herramienta.up.railway.app'],
                ['Infraestructura', 'Railway (cloud PaaS)'],
                ['Versión actual', info?.version ?? '2.6.0'],
                ['Alcance', '~282 empleados · 437 herramientas registradas'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-semibold text-gray-600 w-36 shrink-0">{k}:</span>
                  <span className="text-gray-800 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 02 STACK TECNOLÓGICO ── */}
        <Section num={2} title="Stack Tecnológico">
          <Table
            headers={['Capa', 'Tecnología', 'Versión / Detalle']}
            rows={[
              ['Servidor de aplicación', 'Node.js + Express', 'Node 20 LTS / Express 4.x'],
              ['Frontend', 'React + Vite + Tailwind CSS', 'React 18 / Vite 5.x / Tailwind 3.x'],
              ['Base de datos', 'PostgreSQL', 'v16 (Railway managed, SSL habilitado)'],
              ['Driver de BD', 'pg (node-postgres)', 'v8.12'],
              ['Autenticación', 'JSON Web Tokens', 'jsonwebtoken v9 / HS256 / 24h expiry'],
              ['Hashing de contraseñas', 'bcryptjs', 'v2.4.3 — rounds: 12'],
              ['Rate limiting', 'express-rate-limit', 'v7.4 — múltiples políticas por ruta'],
              ['Headers de seguridad', 'Helmet', 'v8.0 — CSP, HSTS, X-Frame-Options, etc.'],
              ['Contenedor', 'Docker multi-stage', 'node:20-alpine / usuario no-root (node)'],
              ['Infraestructura', 'Railway', 'Producción — auto-deploy desde rama master'],
              ['Generación de Excel', 'ExcelJS', 'v4.4'],
              ['Cookies', 'cookie-parser', 'httpOnly + Secure + SameSite=Strict'],
              ['PWA / Service Worker', 'vite-plugin-pwa + Workbox', 'v1.3.0 — instalable en móviles, caché offline, auto-update'],
              ['Cifrado en reposo', 'Node.js crypto (built-in)', 'AES-256-GCM — fotos y firmas cifradas en BD'],
            ]}
          />
        </Section>

        {/* ── 03 ARQUITECTURA ── */}
        <Section num={3} title="Arquitectura del Sistema">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 font-mono text-[11px] leading-relaxed text-gray-700 mb-4 overflow-x-auto whitespace-pre">
{`┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser / PWA)                     │
│              React 18 + Vite + Tailwind CSS (SPA + PWA)            │
│  JWT en cookie httpOnly · Cartas responsivas generadas al vuelo     │
│  El PDF solo existe en el navegador (window.print) — no se guarda  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTPS / TLS (forzado en producción)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Railway Proxy / CDN                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│            Express Server  (node:20-alpine, USER node)              │
│  ┌──────────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ Helmet (CSP/ │ │    CORS    │ │  Cookie  │ │  Rate Limiters  │  │
│  │ HSTS/XFO)   │ │ FRONTEND_  │ │  Parser  │ │  login·pwd·     │  │
│  └──────────────┘ │ URL only  │ └──────────┘ │  verificar      │  │
│                   └────────────┘             └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /api/auth   /api/revisiones  /api/empleados  /api/admin   │   │
│  │  /api/herramientas  /api/exportar  /api/config  /api/...   │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│      Al escribir ──► encrypt(AES-256-GCM)   decrypt ◄── Al leer  │
│      fotos/firmas cifradas con ENCRYPTION_KEY (Railway env var)   │
│                             │  Parameterized queries (no ORM)     │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  pg + SSL
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PostgreSQL 16  (Railway managed)                        │
│  9 tablas · 12 migraciones                                          │
│  Fotos y firmas almacenadas cifradas (AES-256-GCM) — ilegibles      │
│  sin la ENCRYPTION_KEY aunque se acceda directamente al dump de BD  │
└─────────────────────────────────────────────────────────────────────┘`}
          </div>
        </Section>

        {/* ── 04 MÓDULOS FUNCIONALES ── */}
        <Section num={4} title="Módulos Funcionales">
          <Table
            headers={['Módulo', 'Descripción', 'Acceso']}
            rows={[
              ['Dashboard', 'Resumen de actividad reciente y métricas generales', <Badge color="blue">Todos</Badge>],
              ['Nueva Revisión', 'Wizard de captura de auditoría paso a paso (auto + equipo de cómputo)', <Badge color="blue">Todos</Badge>],
              ['Historial', 'Consulta, búsqueda y filtrado de revisiones registradas', <Badge color="blue">Todos</Badge>],
              ['Carta Responsiva Auto', 'Generación de carta compromiso PDF con firmas digitales, 2 páginas', <Badge color="blue">Todos</Badge>],
              ['Carta Responsiva Equipo', 'Generación de carta responsiva laptop/equipo con firmas digitales', <Badge color="blue">Todos</Badge>],
              ['Verificador Público', 'Validación de autenticidad via SHA-256 (acceso público sin auth)', <Badge color="green">Público</Badge>],
              ['Sin Validar', 'Lista de herramientas MAF sin revisión registrada', <Badge color="blue">Todos</Badge>],
              ['Usuarios', 'CRUD de cuentas de acceso (admin y auditor)', <Badge color="amber">Admin</Badge>],
              ['Empleados', 'Catálogo de empleados — búsqueda y gestión', <Badge color="amber">Admin</Badge>],
              ['Herramientas', 'Catálogo MAF con historial de revisiones por activo', <Badge color="amber">Admin</Badge>],
              ['Importar Datos', 'Carga masiva de empleados y herramientas desde Excel o JSON', <Badge color="amber">Admin</Badge>],
              ['Mi Firma (auditor)', 'Captura y gestión de la firma pre-guardada del auditor, disponible como acción rápida en el Dashboard', <Badge color="blue">Todos</Badge>],
              ['Exportar Excel', 'Reporte Excel de revisiones con filtro por fecha', <Badge color="amber">Admin</Badge>],
              ['Exportar ZIP Responsivas', 'Descarga masiva de cartas responsivas (auto y/o equipo) en ZIP con un PDF por empleado', <Badge color="blue">Configurado por admin</Badge>],
              ['Configuración', 'Parámetros del sistema: RH (nombre + firma + modo opcional + pendientes de firma), ciudad, inactividad, permisos de exportación por usuario', <Badge color="amber">Admin</Badge>],
              ['Reset', 'Limpieza controlada de datos con opciones granulares', <Badge color="amber">Admin</Badge>],
              ['Documentación', 'Visualización y exportación de este documento técnico', <Badge color="amber">Admin</Badge>],
            ]}
          />
        </Section>

        {/* ── 05 CONTROLES DE SEGURIDAD ── */}
        <Section num={5} title="Controles de Seguridad Implementados">
          <Table
            compact
            headers={['Control', 'Implementación', 'Referencia']}
            rows={[
              ['Autenticación', 'JWT en cookie httpOnly + Secure (prod) + SameSite=Strict', <Badge color="teal">OWASP A07:2021</Badge>],
              ['Política de contraseñas', 'Mín. 8 chars · 1 mayúscula · 1 número · bcrypt rounds=12', <Badge color="teal">NIST SP 800-63B</Badge>],
              ['Rate limit — login', '10 peticiones / 15 min por IP', <Badge color="teal">OWASP A04:2021</Badge>],
              ['Rate limit — pwd change', '5 peticiones / 15 min por usuario', <Badge color="teal">OWASP A04:2021</Badge>],
              ['Rate limit — verificar', '30 peticiones / min por IP (endpoint público)', <Badge color="teal">OWASP A04:2021</Badge>],
              ['Bloqueo de cuenta', '5 intentos fallidos → 15 min (persistido en PostgreSQL)', <Badge color="teal">OWASP A07:2021</Badge>],
              ['Desbloqueo manual por admin', 'El administrador puede desbloquear cuentas antes del tiempo de espera desde Admin → Usuarios. Alerta visible en el Dashboard.', <Badge color="teal">OWASP A07:2021</Badge>],
              ['Content Security Policy', "defaultSrc: 'self' · scriptSrc: 'self' · frameAncestors: none", <Badge color="teal">OWASP A05:2021</Badge>],
              ['HTTP Strict Transport Security', 'HSTS habilitado vía Helmet en producción', <Badge color="teal">OWASP A02:2021</Badge>],
              ['Clickjacking', 'X-Frame-Options: DENY + CSP frameAncestors: none', <Badge color="teal">OWASP A05:2021</Badge>],
              ['CORS', 'Restringido a variable de entorno FRONTEND_URL', <Badge color="teal">OWASP A05:2021</Badge>],
              ['Validación de secretos', 'JWT_SECRET validado en startup (mín. 32 chars) — proceso falla si no cumple', <Badge color="teal">OWASP A02:2021</Badge>],
              ['Control de acceso por rol', 'Middleware requireAuth + requireAdmin en todos los endpoints sensibles', <Badge color="teal">OWASP A01:2021</Badge>],
              ['Inyección SQL', 'Parameterized queries (pg) en todas las consultas — sin concatenación', <Badge color="teal">OWASP A03:2021</Badge>],
              ['Formula injection (Excel)', "Prefijo ' en valores que inician con =+−@|% en exportación", <Badge color="teal">OWASP A03:2021</Badge>],
              ['Límites de entrada', 'observaciones max 2000 chars · comentarios max 1000 · paginación max 100 rows', <Badge color="teal">OWASP A03:2021</Badge>],
              ['Auditoría de accesos', 'auth_log: evento, IP, user-agent, timestamp — login/logout/login_failed', <Badge color="teal">OWASP A09:2021</Badge>],
              ['Inactividad de sesión', 'Cierre automático configurable (default 20 min)', <Badge color="teal">OWASP A07:2021</Badge>],
              ['Error handling', 'Mensajes genéricos al cliente; detalle interno solo en logs de servidor', <Badge color="teal">OWASP A05:2021</Badge>],
              ['Contenedor no-root', 'Docker: USER node + chown /app — proceso sin privilegios de root', <Badge color="teal">CIS Docker Benchmark</Badge>],
              ['Almacenamiento de media', 'Fotos y firmas en base64 en BD (no filesystem efímero de Railway)', <Badge color="teal">Disponibilidad</Badge>],
              ['Cifrado fotos y firmas (reposo)', 'AES-256-GCM a nivel aplicación · IV aleatorio de 12 bytes por registro · autenticación GCM · clave ENCRYPTION_KEY (32 bytes) en Railway env · compatible con datos previos sin clave', <Badge color="teal">OWASP A02:2021</Badge>],
              ['Aplicación instalable (PWA)', 'vite-plugin-pwa genera manifest + service worker · autoUpdate · cache NetworkFirst para API · instalable en Android (Chrome) y iOS (Safari)', <Badge color="teal">Disponibilidad</Badge>],
              ['Integridad de documentos', 'SHA-256 embebido en carta responsiva + endpoint de verificación pública', <Badge color="teal">ISO 27001 A.10</Badge>],
            ]}
          />
        </Section>

        {/* ── 06 AUTENTICACIÓN Y AUTORIZACIÓN ── */}
        <Section num={6} title="Autenticación y Autorización">
          <div className="grid grid-cols-2 gap-6 text-xs mb-4">
            <div>
              <p className="font-semibold text-gray-700 mb-2 text-[11px] uppercase tracking-wide">Roles del sistema</p>
              <Table
                headers={['Rol', 'Permisos']}
                rows={[
                  [<Badge color="red">admin</Badge>, 'Acceso total: gestión de usuarios, configuración, reset, exportar, documentación'],
                  [<Badge color="blue">auditor</Badge>, 'Acceso operativo: nueva revisión, historial, cartas responsivas, sin validar'],
                ]}
              />
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-2 text-[11px] uppercase tracking-wide">Token JWT</p>
              <div className="space-y-1.5 text-xs">
                {[
                  ['Algoritmo', 'HS256'],
                  ['Expiración', '24 horas'],
                  ['Transporte', 'Cookie httpOnly · Secure (prod) · SameSite=Strict'],
                  ['Payload', '{ id, username, nombre, rol }'],
                  ['Secreto', 'JWT_SECRET env var · validado ≥ 32 chars en startup'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="font-semibold text-gray-500 w-24 shrink-0">{k}:</span>
                    <span className="font-mono text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2 text-[11px] uppercase tracking-wide">Política de bloqueo de cuenta</p>
            <Table
              headers={['Parámetro', 'Valor']}
              rows={[
                ['Umbral de intentos fallidos', '5 intentos'],
                ['Duración del bloqueo', '15 minutos'],
                ['Persistencia', 'Tabla login_attempts en PostgreSQL'],
                ['Limpieza', 'Se elimina al login exitoso'],
                ['Respuesta al cliente', 'HTTP 423 con tiempo restante en minutos'],
              ]}
            />
          </div>
        </Section>

        {/* ── 07 ENDPOINTS DE API ── */}
        <Section num={7} title="Endpoints de API">
          <Table
            compact
            headers={['Método', 'Ruta', 'Auth', 'Descripción']}
            rows={[
              [<Badge color="green">POST</Badge>, '/api/auth/login', <Badge color="gray">Pública</Badge>, 'Inicio de sesión con lockout y registro en auth_log'],
              [<Badge color="green">POST</Badge>, '/api/auth/logout', <Badge color="blue">Auth</Badge>, 'Cierre de sesión + limpieza de cookie + auth_log'],
              [<Badge color="blue">GET</Badge>, '/api/auth/me', <Badge color="blue">Auth</Badge>, 'Perfil del usuario autenticado (desde JWT)'],
              [<Badge color="blue">GET</Badge>, '/api/config', <Badge color="blue">Auth</Badge>, 'Configuración pública del sistema (app_config)'],
              [<Badge color="blue">GET</Badge>, '/api/version', <Badge color="gray">Pública</Badge>, 'Versión actual de la aplicación'],
              [<Badge color="blue">GET</Badge>, '/api/health', <Badge color="gray">Pública</Badge>, 'Estado de salud del servidor'],
              [<Badge color="blue">GET</Badge>, '/api/verificar/:id', <Badge color="gray">Pública*</Badge>, 'Verificar autenticidad de documento (rate limited: 30/min)'],
              [<Badge color="blue">GET</Badge>, '/api/revisiones', <Badge color="blue">Auth</Badge>, 'Listar historial (paginado, max 100/página)'],
              [<Badge color="green">POST</Badge>, '/api/revisiones', <Badge color="blue">Auth</Badge>, 'Crear revisión completa (transacción atómica)'],
              [<Badge color="blue">GET</Badge>, '/api/revisiones/:id', <Badge color="blue">Auth</Badge>, 'Detalle completo con firmas y fotos base64'],
              [<Badge color="blue">GET</Badge>, '/api/empleados/search', <Badge color="blue">Auth</Badge>, 'Búsqueda de empleados por nombre o número'],
              [<Badge color="blue">GET</Badge>, '/api/herramientas/search', <Badge color="blue">Auth</Badge>, 'Búsqueda de herramientas por código de barras'],
              [<Badge color="blue">GET</Badge>, '/api/herramientas/catalog', <Badge color="blue">Auth</Badge>, 'Catálogo de marcas y modelos de equipo'],
              [<Badge color="amber">PUT</Badge>, '/api/usuarios/me/password', <Badge color="blue">Auth</Badge>, 'Cambio de contraseña (rate limited: 5/15min)'],
              [<Badge color="blue">GET</Badge>, '/api/usuarios/me/firma', <Badge color="blue">Auth</Badge>, 'Obtener firma pre-guardada del auditor (base64)'],
              [<Badge color="amber">PUT</Badge>, '/api/usuarios/me/firma', <Badge color="blue">Auth</Badge>, 'Guardar o actualizar la firma pre-guardada del auditor'],
              [<Badge color="red">DELETE</Badge>, '/api/usuarios/me/firma', <Badge color="blue">Auth</Badge>, 'Eliminar la firma pre-guardada del auditor'],
              [<Badge color="blue">GET</Badge>, '/api/exportar/revisiones', <Badge color="amber">Admin</Badge>, 'Exportar Excel de revisiones con filtro por fecha'],
              [<Badge color="blue">GET</Badge>, '/api/responsivas/auto', <Badge color="blue">Configurado</Badge>, 'Exportar ZIP con cartas responsivas de autos (PDF por empleado)'],
              [<Badge color="blue">GET</Badge>, '/api/responsivas/equipo', <Badge color="blue">Configurado</Badge>, 'Exportar ZIP con cartas responsivas de equipo (PDF por empleado)'],
              [<Badge color="blue">GET</Badge>, '/api/admin/config', <Badge color="amber">Admin</Badge>, 'Configuración completa del sistema'],
              [<Badge color="amber">PUT</Badge>, '/api/admin/config', <Badge color="amber">Admin</Badge>, 'Actualizar parámetros de configuración'],
              [<Badge color="blue">GET</Badge>, '/api/admin/sysinfo', <Badge color="amber">Admin</Badge>, 'Estadísticas y estado del sistema'],
              [<Badge color="green">POST</Badge>, '/api/admin/reset', <Badge color="amber">Admin</Badge>, 'Resetear datos con opciones granulares'],
              [<Badge color="blue">GET</Badge>, '/api/admin/herramientas', <Badge color="amber">Admin</Badge>, 'Catálogo MAF completo con filtros'],
              [<Badge color="blue">GET</Badge>, '/api/admin/empleados', <Badge color="amber">Admin</Badge>, 'Catálogo de empleados'],
              [<Badge color="blue">GET</Badge>, '/api/admin/usuarios', <Badge color="amber">Admin</Badge>, 'Gestión de cuentas de usuario'],
              [<Badge color="green">POST</Badge>, '/api/admin/usuarios', <Badge color="amber">Admin</Badge>, 'Crear usuario (valida complejidad de contraseña)'],
              [<Badge color="teal">PATCH</Badge>, '/api/admin/usuarios/:id', <Badge color="amber">Admin</Badge>, 'Actualizar datos de usuario'],
              [<Badge color="red">DELETE</Badge>, '/api/admin/usuarios/:id', <Badge color="amber">Admin</Badge>, 'Eliminar usuario (protege último admin)'],
              [<Badge color="blue">GET</Badge>, '/api/admin/template/:tipo', <Badge color="amber">Admin</Badge>, 'Descargar plantilla Excel (empleados|herramientas)'],
              [<Badge color="green">POST</Badge>, '/api/admin/import-excel/:tipo', <Badge color="amber">Admin</Badge>, 'Importar desde Excel (upsert idempotente)'],
              [<Badge color="red">DELETE</Badge>, '/api/admin/config/rh', <Badge color="amber">Admin</Badge>, 'Eliminar nombre y firma del Responsable de RH de app_config'],
              [<Badge color="blue">GET</Badge>, '/api/admin/pendientes-firma-rh', <Badge color="amber">Admin</Badge>, 'Listar revisiones con firma_rh_pendiente=true (cartas sin firma RH)'],
              [<Badge color="green">POST</Badge>, '/api/admin/aplicar-firma-rh', <Badge color="amber">Admin</Badge>, 'Aplicar firma RH actual a todos los documentos pendientes (actualiza revision_auto + revision_equipo)'],
              [<Badge color="blue">GET</Badge>, '/api/admin/exportar-responsivas-roles', <Badge color="blue">Auth</Badge>, 'Verificar si el usuario actual tiene permiso de exportar responsivas (admin siempre sí; auditor según can_export_responsivas)'],
              [<Badge color="blue">GET</Badge>, '/api/admin/usuarios-bloqueados', <Badge color="amber">Admin</Badge>, 'Listar cuentas con bloqueo activo (locked_until > NOW()), con nombre, intentos fallidos y tiempo restante'],
              [<Badge color="red">DELETE</Badge>, '/api/admin/usuarios-bloqueados/:username', <Badge color="amber">Admin</Badge>, 'Desbloquear manualmente una cuenta eliminando su registro de login_attempts'],
            ]}
          />
        </Section>

        {/* ── 08 BASE DE DATOS ── */}
        <Section num={8} title="Esquema de Base de Datos">
          <Table
            headers={['Tabla', 'Propósito', 'Columnas clave']}
            rows={[
              ['app_users', 'Cuentas de acceso al sistema', 'id · username · password_hash · rol · is_active · last_login · firma (AES-256-GCM) · can_export_responsivas'],
              ['empleados', 'Catálogo de empleados OXXO', 'id · numero_empleado (UNIQUE) · nombre_completo · posicion · plaza · region'],
              ['herramientas', 'Catálogo MAF (autos y equipo de cómputo)', 'id · tipo · codigo_barras · no_activo · marca · modelo · serie · plaza · empleado_id'],
              ['revisiones', 'Registro maestro de auditorías', 'id (folio SICH) · empleado_id · app_user_id · auditor_nombre · fecha_revision · tiene_auto · tiene_equipo · firma_rh_pendiente'],
              ['revision_auto', 'Datos de revisión de vehículo', 'revision_id · herramienta_id · placas · no_serie · kilometraje · firmas (AES-256-GCM) · fotos (AES-256-GCM) · danos (JSONB)'],
              ['revision_equipo', 'Datos de revisión de equipo de cómputo', 'revision_id · herramienta_id · codigo_barras · marca · modelo · serie · foto (AES-256-GCM) · firmas (AES-256-GCM)'],
              ['app_config', 'Configuración del sistema', 'key (PK) · value — inactivity_minutes · ciudad_revision · nombre_responsable_rh · firma_responsable_rh (AES-256-GCM) · firma_rh_opcional'],
              ['login_attempts', 'Control de bloqueo por intentos fallidos', 'username (PK) · count · locked_until · updated_at'],
              ['auth_log', 'Auditoría de accesos al sistema', 'id · username · app_user_id · event · ip · user_agent · created_at'],
            ]}
          />
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Historial de migraciones</p>
            <Table
              compact
              headers={['Migración', 'Descripción']}
              rows={[
                ['001_schema.sql', 'Esquema base: app_users, empleados, herramientas, revisiones, revision_auto, revision_equipo'],
                ['002_seed.sql', 'Usuario administrador inicial (contraseña protegida con bcrypt)'],
                ['003_damage_sigs.sql', 'Campos JSONB para daños y firmas digitales en revisiones'],
                ['004_auto_extras.sql', 'Campos adicionales de vehículo: gato_cruceta, foto_licencia_reverso, foto_poliza_seguro, domicilio, cp'],
                ['005_config_lockout.sql', 'Tablas login_attempts y app_config · default inactivity_minutes=20'],
                ['006_placas.sql', 'Campo foto_poliza_seguro + precarga de placas desde catálogo SIGE (181 autos)'],
                ['007_firma_rh_pendiente.sql', 'Columna firma_rh_pendiente en revisiones + clave firma_rh_opcional en app_config'],
                ['008_firma_auditor.sql', 'Columna firma (TEXT) en app_users para firma pre-guardada del auditor (AES-256-GCM)'],
                ['009_auth_log.sql', 'Tabla auth_log para auditoría de accesos (evento, IP, user-agent, timestamp)'],
                ['010_pdfkit.sql', 'Tabla auxiliar para generación de PDF — sin cambios de esquema (migraciones numéricas)'],
                ['011_exportar_responsivas_roles.sql', 'Clave exportar_responsivas_roles en app_config (valor legacy; reemplazado por can_export_responsivas)'],
                ['012_can_export_responsivas.sql', 'Columna can_export_responsivas BOOLEAN en app_users (default false; true para admins)'],
              ]}
            />
          </div>
        </Section>

        {/* ── 09 FLUJO DE AUDITORÍA ── */}
        <Section num={9} title="Flujo de Auditoría de Herramienta">
          <div className="space-y-2">
            {[
              ['01', 'Búsqueda de empleado', 'El auditor ingresa nombre o número de empleado; el sistema sugiere coincidencias en tiempo real.'],
              ['02', 'Confirmación de datos', 'Verificación de plaza, posición, departamento y herramientas asignadas (auto y/o equipo de cómputo).'],
              ['03', 'Selección de herramienta', 'El auditor selecciona la herramienta a revisar mediante código de barras o búsqueda en catálogo MAF.'],
              ['04', 'Captura física del vehículo', 'Registro de placas, no. serie, kilometraje, estado general, licencia, llanta refacción, póliza de seguro. Captura de fotos.'],
              ['05', 'Registro de daños', 'Panel interactivo de daños con etiquetas descriptivas y campo de observaciones.'],
              ['06', 'Firmas digitales', 'Captura de firma del empleado y firma del auditor en canvas táctil. Si el auditor tiene una firma pre-guardada en su perfil (Dashboard → Mi Firma), se precarga automáticamente y puede sobreescribirse. La firma del Responsable de RH se inyecta automáticamente si está configurada. Si el modo "firma opcional" está activo, la auditoría puede completarse sin ella; el documento quedará marcado como pendiente de firma RH.'],
              ['07', 'Resumen y confirmación', 'Vista previa completa de todos los datos antes de guardar. El auditor puede regresar a cualquier paso.'],
              ['08', 'Registro en base de datos', 'Transacción atómica: INSERT en revisiones (con firma_rh_pendiente=true si falta firma RH) + revision_auto / revision_equipo. Fotos y firmas se cifran con AES-256-GCM antes de persistir. Asignación de folio SICH-XXXXXX.'],
              ['09', 'Generación de carta responsiva', 'La carta NO se almacena como archivo en ningún servidor. Cada vez que se consulta, el API retorna los datos de la revisión (descifrados en ese momento), React renderiza el HTML al vuelo y el usuario puede imprimirla o exportarla como PDF con window.print(). El PDF solo existe en el navegador mientras está abierto.'],
              ['10', 'Verificación de autenticidad', 'Endpoint público /verificar/:id permite validar la autenticidad e integridad del documento mediante el folio o QR.'],
              ['11', 'Completar firma RH pendiente', 'El administrador configura la firma del Responsable de RH y, desde Configuración → "Documentos pendientes de firma RH", aplica la firma a todos los documentos pendientes en una sola acción. El sistema actualiza revision_auto y revision_equipo, y las cartas responsivas quedan completas al siguiente acceso.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="flex gap-3 text-xs">
                <span className="font-mono font-bold text-[#134e4a] bg-teal-50 border border-teal-200 px-2 py-1 rounded text-center w-8 shrink-0 h-fit">{num}</span>
                <div>
                  <span className="font-semibold text-gray-800">{title} — </span>
                  <span className="text-gray-600">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 10 CONFIGURACIÓN ── */}
        <Section num={10} title="Configuración del Sistema">
          <Table
            headers={['Parámetro', 'Clave (app_config)', 'Default', 'Descripción', 'Requerido']}
            rows={[
              ['Tiempo de inactividad', <span className="font-mono">inactivity_minutes</span>, '20', 'Minutos antes de cierre de sesión automático (rango: 1–480)', <Badge color="gray">No</Badge>],
              ['Ciudad de revisión', <span className="font-mono">ciudad_revision</span>, '—', 'Ciudad que aparece en las cartas responsivas. Bloquea nuevas revisiones si no está configurada.', <Badge color="red">Sí</Badge>],
              ['Nombre Responsable RH', <span className="font-mono">nombre_responsable_rh</span>, '—', 'Nombre del Responsable de RH que aparece en las cartas. Bloquea nuevas revisiones si no está configurado.', <Badge color="red">Sí</Badge>],
              ['Firma Responsable RH', <span className="font-mono">firma_responsable_rh</span>, '—', 'Firma digital del RH (base64 JPEG). Se inyecta automáticamente en todas las cartas. Almacenada cifrada (AES-256-GCM). Bloquea nuevas revisiones si no está configurada y firma_rh_opcional=false.', <Badge color="red">Cond.</Badge>],
              ['Modo firma RH opcional', <span className="font-mono">firma_rh_opcional</span>, 'false', 'Si es "true", permite registrar auditorías sin firma RH. Los documentos generados sin firma quedan marcados como pendientes (firma_rh_pendiente=true) y pueden completarse después desde Configuración.', <Badge color="gray">No</Badge>],
            ]}
          />
          <p className="text-[10px] text-gray-500 mt-2">
            * ciudad_revision, nombre_responsable_rh y firma_responsable_rh bloquean nuevas revisiones si faltan, a menos que firma_rh_opcional esté activo (en ese caso solo ciudad_revision es obligatoria).
          </p>
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Variables de entorno requeridas (Railway)</p>
            <Table
              compact
              headers={['Variable', 'Tipo', 'Descripción']}
              rows={[
                [<span className="font-mono">DATABASE_URL</span>, <Badge color="red">Requerida</Badge>, 'Cadena de conexión a PostgreSQL (Railway la provee automáticamente)'],
                [<span className="font-mono">JWT_SECRET</span>, <Badge color="red">Requerida</Badge>, 'Secreto HS256 mín. 32 chars. El servidor no arranca si falta o es corto.'],
                [<span className="font-mono">NODE_ENV</span>, <Badge color="red">Requerida</Badge>, 'Debe ser "production" para habilitar HTTPS, HSTS, migraciones automáticas y servir el SPA.'],
                [<span className="font-mono">FRONTEND_URL</span>, <Badge color="red">Requerida</Badge>, 'Origen autorizado en CORS. Ej: https://control-herramienta.up.railway.app'],
                [<span className="font-mono">ENCRYPTION_KEY</span>, <Badge color="amber">Recomendada</Badge>, '64 caracteres hexadecimales (32 bytes). Habilita AES-256-GCM para fotos y firmas. Sin esta variable los datos se almacenan sin cifrar (degradación controlada).'],
              ]}
            />
          </div>
        </Section>

        {/* ── 11 SEGURIDAD DE LA INFORMACIÓN ── */}
        <Section num={11} title="Seguridad de la Información">

          {/* Modelo de documentos */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Modelo de almacenamiento y generación de documentos</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-3 mb-3">
              <p className="font-semibold text-blue-800">¿Las cartas responsivas se guardan como archivos en el servidor?</p>
              <p><strong>No.</strong> Las cartas responsivas (auto y equipo) <strong>no se almacenan como archivos PDF ni HTML en ningún servidor</strong>. Cada vez que un usuario abre una carta, ocurre el siguiente proceso en tiempo real:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>El navegador solicita los datos al API (<span className="font-mono bg-blue-100 px-1 rounded">GET /api/revisiones/:id</span>).</li>
                <li>El backend descifra las fotos y firmas (AES-256-GCM) y devuelve los datos en JSON.</li>
                <li>React renderiza el documento HTML al vuelo en el navegador.</li>
                <li>El usuario puede imprimir o exportar como PDF con <span className="font-mono bg-blue-100 px-1 rounded">window.print()</span>.</li>
                <li><strong>El PDF solo existe mientras está abierto en el navegador</strong> — no se sube ni persiste en ningún servidor.</li>
              </ol>
            </div>
            <Table
              compact
              headers={['Capa', '¿Qué se guarda?', '¿Cómo está protegido?']}
              rows={[
                ['PostgreSQL (reposo)', 'Fotos (licencia, vehículo, póliza, llanta) y firmas (empleado, auditor, RH) como base64 TEXT cifrado. Resto de campos en texto plano.', 'AES-256-GCM · IV aleatorio de 12 bytes por campo · autenticación GCM · clave ENCRYPTION_KEY externa a la BD · ilegible sin la clave aunque se obtenga el dump completo'],
                ['Tránsito (red)', 'JSON con datos de revisión (incluyendo fotos/firmas ya descifradas) entre servidor y navegador.', 'HTTPS/TLS forzado en producción (HSTS) · cookie JWT httpOnly + SameSite=Strict'],
                ['Navegador (cliente)', 'Datos en memoria de React mientras la pestaña está abierta. PDF generado localmente si el usuario lo exporta.', 'CSP impide scripts externos · cookie httpOnly inaccesible desde JS · sin localStorage para datos sensibles'],
                ['Servidor de archivos', 'No existe — Railway tiene filesystem efímero. No se escribe ningún PDF o imagen en disco.', 'N/A — no hay archivos que proteger en el servidor'],
              ]}
            />
          </div>

          {/* Clasificación */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Clasificación de la información</p>
            <Table
              headers={['Nivel', 'Datos', 'Controles aplicados']}
              rows={[
                [<Badge color="red">Confidencial</Badge>, 'Nombre completo del empleado · número de empleado · domicilio · foto de licencia · firma digital · foto de unidad', 'Acceso solo con sesión autenticada · transmisión HTTPS · almacenamiento en BD cifrada en tránsito'],
                [<Badge color="amber">Uso interno</Badge>, 'Configuración del sistema · logs de auditoría (auth_log) · catálogo MAF · historial de revisiones · usuarios del sistema', 'Acceso restringido por rol (admin/auditor) · no expuesto públicamente'],
                [<Badge color="green">Público</Badge>, 'Verificación de autenticidad de documentos (folio, fecha, auditor, plaza) — sin datos personales sensibles', 'Endpoint público rate-limited · no requiere autenticación · mínima exposición de PII'],
              ]}
            />
          </div>

          {/* Triada CIA */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Principios CIA — Confidencialidad · Integridad · Disponibilidad</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                {
                  letra: 'C', color: 'bg-blue-600', titulo: 'Confidencialidad',
                  items: [
                    'JWT en cookie httpOnly (inaccesible desde JS)',
                    'Contraseñas con bcrypt rounds=12',
                    'HTTPS/TLS obligatorio en producción (HSTS)',
                    'Control de acceso por roles (admin/auditor)',
                    'CORS restringido a dominio autorizado',
                    'CSP impide carga de recursos externos',
                    'AES-256-GCM: fotos y firmas cifradas en BD (reposo)',
                  ]
                },
                {
                  letra: 'I', color: 'bg-teal-600', titulo: 'Integridad',
                  items: [
                    'Transacciones atómicas en BD (BEGIN/COMMIT/ROLLBACK)',
                    'SHA-256 embebido en cada carta responsiva',
                    'Parameterized queries (previene SQL injection)',
                    'Validación de entrada en todos los endpoints',
                    'Upsert idempotente en importaciones',
                    'Firmas digitales en canvas blanco (sin artefactos)',
                  ]
                },
                {
                  letra: 'A', color: 'bg-green-600', titulo: 'Disponibilidad',
                  items: [
                    'Railway managed PostgreSQL con backups automáticos',
                    'Auto-deploy desde rama master (sin downtime)',
                    'Migraciones idempotentes al arrancar',
                    'Health endpoint /api/health para monitoreo',
                    'Fotos/firmas en BD (no filesystem efímero de Railway)',
                    'Cartas generadas al vuelo — sin dependencia de archivos físicos',
                    'Inactividad configurable (no desconecta por error)',
                    'PWA con caché offline (Workbox NetworkFirst)',
                  ]
                },
              ].map(({ letra, color, titulo, items }) => (
                <div key={letra} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className={`${color} text-white px-3 py-2 flex items-center gap-2`}>
                    <span className="font-black text-lg font-mono">{letra}</span>
                    <span className="font-semibold text-xs">{titulo}</span>
                  </div>
                  <ul className="p-3 space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className="text-[10px] text-gray-600 flex gap-1.5">
                        <span className="text-gray-400 shrink-0 mt-0.5">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Marco normativo */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Marco normativo de referencia</p>
            <Table
              compact
              headers={['Marco / Norma', 'Aplicación en SICH']}
              rows={[
                ['OWASP Top 10 2021', 'Los 10 riesgos están cubiertos: A01 (RBAC) · A02 (HSTS/bcrypt) · A03 (parameterized queries) · A04 (rate limiting) · A05 (Helmet/CSP/CORS) · A06 (dependencias actualizadas) · A07 (JWT+lockout+inactividad) · A08 (validación de entrada) · A09 (auth_log) · A10 (JWT_SECRET en env var)'],
                ['NIST SP 800-63B', 'Política de contraseñas: mínimo 8 caracteres · complejidad (mayúscula + número) · hashing con bcrypt factor 12 · sin sugerencias de contraseña al cliente'],
                ['ISO/IEC 27001:2022', 'Controles aplicados: A.5 (políticas) · A.8 (gestión de activos) · A.9 (control de acceso) · A.10 (criptografía) · A.12 (operaciones seguras) · A.14 (adquisición segura)'],
                ['CIS Docker Benchmark', 'Contenedor con usuario no-root (USER node) · imagen base oficial node:20-alpine · sin secretos en Dockerfile · dependencias de producción únicamente (--omit=dev)'],
                ['LFPDPPP (México)', 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares: datos de empleados tratados solo para fines de auditoría interna · acceso restringido a personal autorizado · no se comparten con terceros'],
              ]}
            />
          </div>

          {/* Datos personales */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Datos personales tratados (LFPDPPP)</p>
            <Table
              compact
              headers={['Dato', 'Finalidad', 'Retención']}
              rows={[
                ['Nombre completo del empleado', 'Identificación en carta responsiva y registro de auditoría', 'Mientras el empleado esté activo en el catálogo'],
                ['Número de empleado', 'Identificador único para búsqueda y asignación de herramientas', 'Mientras el empleado esté activo en el catálogo'],
                ['Domicilio y C.P.', 'Requerido en carta compromiso de vehículo (cláusula legal)', 'Por el tiempo que la revisión esté registrada'],
                ['Fotografía de licencia de conducir', 'Verificación de vigencia durante la auditoría', 'Por el tiempo que la revisión esté registrada'],
                ['Firma digital (electrónica)', 'Consentimiento del empleado sobre las condiciones del convenio', 'Permanente — validez legal del documento'],
                ['Fotografías del vehículo/equipo', 'Evidencia del estado físico de la herramienta auditada', 'Por el tiempo que la revisión esté registrada'],
              ]}
            />
          </div>

          {/* Responsabilidades */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Responsabilidades por rol</p>
            <Table
              headers={['Rol', 'Responsabilidades de seguridad']}
              rows={[
                [<Badge color="red">Administrador</Badge>, 'Gestionar cuentas de acceso · configurar parámetros del sistema · revisar auth_log ante sospechas de acceso no autorizado · rotar credenciales cuando sea necesario · mantener configurados los parámetros obligatorios (RH, ciudad)'],
                [<Badge color="blue">Auditor</Badge>, 'No compartir credenciales de acceso · cerrar sesión al finalizar (o configurar inactividad) · capturar información fidedigna · custodiar el dispositivo durante la revisión · reportar anomalías al administrador'],
                [<Badge color="teal">Responsable RH</Badge>, 'Validar que la firma digital registrada en el sistema sea la propia y esté vigente · notificar al administrador si cambia o si el cargo es asignado a otra persona'],
              ]}
            />
          </div>

          {/* Respuesta a incidentes */}
          <div>
            <p className="text-[11px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Protocolo de respuesta a incidentes de seguridad</p>
            <div className="space-y-1.5">
              {[
                ['01', 'Detección', 'El administrador o auditor detecta comportamiento anómalo: intentos de login fallidos, acceso inusual o datos incorrectos.'],
                ['02', 'Contención', 'El administrador desactiva la cuenta sospechosa desde Admin → Usuarios y revisa auth_log (IP, user-agent, timestamps).'],
                ['03', 'Análisis', 'Revisión del historial de revisiones para identificar acciones realizadas por la cuenta comprometida.'],
                ['04', 'Recuperación', 'Restablecimiento de contraseña con nueva contraseña segura · reactivación de cuenta si procede · notificación al área de TI.'],
                ['05', 'Documentación', 'Registro del incidente, acciones tomadas y lecciones aprendidas. Actualización de configuración si es necesario.'],
              ].map(([num, title, desc]) => (
                <div key={num} className="flex gap-3 text-xs">
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded text-center w-8 shrink-0 h-fit">{num}</span>
                  <div>
                    <span className="font-semibold text-gray-800">{title} — </span>
                    <span className="text-gray-600">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 12 ESTADÍSTICAS ── */}
        <Section num={12} title="Estadísticas Actuales del Sistema">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
                  <div className="h-7 bg-gray-200 rounded w-12" />
                </div>
              ))}
            </div>
          ) : info ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Revisiones totales" value={info.stats.revisiones_total.toLocaleString()} sub={`Última: ${fmt(info.stats.ultima_revision)}`} />
                <StatCard label="Herramientas activas" value={info.stats.herramientas_activas.toLocaleString()} sub="Autos y equipo de cómputo" />
                <StatCard label="Empleados registrados" value={info.stats.empleados.toLocaleString()} sub="Zona Pacífico" />
                <StatCard label="Usuarios activos" value={info.stats.usuarios_activos.toLocaleString()} sub="Admins y auditores" />
              </div>
              <Table
                headers={['Parámetro', 'Valor']}
                rows={[
                  ['Versión desplegada', <span className="font-mono font-bold">{info.version}</span>],
                  ['Documento generado', fmtDT(info.generated_at)],
                  ['Ciudad de revisión configurada', info.config.ciudad_revision || <Badge color="red">No configurada</Badge>],
                  ['Responsable de RH', info.config.nombre_rh || <Badge color="red">No configurado</Badge>],
                  ['Firma RH', info.config.rh_configurado ? <Badge color="green">Configurada</Badge> : <Badge color="red">No configurada</Badge>],
                  ['Tiempo de inactividad', `${info.config.inactivity_minutes} minutos`],
                  ['Última revisión registrada', fmtDT(info.stats.ultima_revision)],
                ]}
              />
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">No se pudieron obtener las estadísticas del servidor.</p>
          )}
        </Section>

        {/* ── PIE DE PÁGINA ── */}
        <div className="border-t-2 border-[#134e4a] pt-4 mt-8 flex items-center justify-between text-[10px] text-gray-400">
          <span>SICH v{info?.version ?? '2.6.0'} · Cadena Comercial OXXO, S.A. de C.V. · Uso interno — Confidencial</span>
          <span>Generado: {today}</span>
        </div>
      </div>

      <style>{`
        @media print {
          .print-section { page-break-inside: avoid; }
          body { font-size: 11px; }
          @page { margin: 1.5cm; size: A4; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </div>
  );
}
