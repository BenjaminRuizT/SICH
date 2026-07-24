import { useState, useEffect } from 'react';
import axios from 'axios';

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
};

const fmtDT = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
};

const Badge = ({ color, children }) => {
  const map = {
    green:  'bg-green-50 text-green-700 border border-green-200',
    amber:  'bg-amber-50 text-amber-700 border border-amber-200',
    red:    'bg-red-50 text-red-700 border border-red-200',
    blue:   'bg-blue-50 text-blue-700 border border-blue-200',
    gray:   'bg-gray-100 text-gray-600 border border-gray-200',
    teal:   'bg-teal-50 text-teal-700 border border-teal-200',
  };
  return <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono ${map[color] || map.gray}`}>{children}</span>;
};

const Section = ({ num, title, children }) => (
  <section className="print-section mb-10">
    <div className="flex items-baseline gap-3 mb-4 pb-2 border-b-2 border-[#134e4a]">
      <span className="text-xs font-mono font-bold text-[#134e4a] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">{String(num).padStart(2, '0')}</span>
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
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    axios.get('/api/admin/sysinfo', { withCredentials: true })
      .then(r => setInfo(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="md:ml-56 print:ml-0 pb-16">
      {/* ── ACCIONES (oculto al imprimir) ── */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documentación Técnica</h1>
          <p className="text-xs text-gray-500 mt-0.5">Generado el {today} · SICH v{info?.version ?? '2.5.0'}</p>
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

        {/* PORTADA */}
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
              Documentación<br/>Técnica del Sistema
            </h1>
            <p className="text-[11px] font-mono text-gray-500 mt-1">
              SICH v{info?.version ?? '2.5.0'} · {today}
            </p>
          </div>
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
                ['Versión actual', info?.version ?? '2.5.0'],
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
            ]}
          />
        </Section>

        {/* ── 03 ARQUITECTURA ── */}
        <Section num={3} title="Arquitectura del Sistema">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 font-mono text-[11px] leading-relaxed text-gray-700 mb-4 overflow-x-auto whitespace-pre">
{`┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                           │
│              React 18 + Vite + Tailwind CSS (SPA)                   │
│         JWT almacenado en cookie httpOnly (no localStorage)         │
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
│  │ HSTS/XFO)   │ │ FRONTEND_  │ │  Parser  │ │  (login·pwd·    │  │
│  └──────────────┘ │ URL only  │ └──────────┘ │   verificar)    │  │
│                   └────────────┘             └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /api/auth   /api/revisiones  /api/empleados  /api/admin   │   │
│  │  /api/herramientas  /api/exportar  /api/config  /api/...   │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │  Parameterized queries (no ORM)     │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  pg + SSL (rejectUnauthorized=false)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PostgreSQL 16  (Railway managed)                        │
│   9 tablas · 6 migraciones · Fotos/firmas base64 en BD             │
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
              ['Exportar', 'Reporte Excel de revisiones con filtro por fecha', <Badge color="amber">Admin</Badge>],
              ['Configuración', 'Parámetros del sistema: RH, ciudad, inactividad', <Badge color="amber">Admin</Badge>],
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
              ['Content Security Policy', "defaultSrc: 'self' · scriptSrc: 'self' · frameAncestors: none", <Badge color="teal">OWASP A05:2021</Badge>],
              ['HTTP Strict Transport Security', 'HSTS habilitado vía Helmet en producción', <Badge color="teal">OWASP A02:2021</Badge>],
              ['Clickjacking', 'X-Frame-Options: DENY + CSP frameAncestors: none', <Badge color="teal">OWASP A05:2021</Badge>],
              ['CORS', 'Restringido a variable de entorno FRONTEND_URL', <Badge color="teal">OWASP A05:2021</Badge>],
              ['Validación de secretos', 'JWT_SECRET validado en startup (mín. 32 chars) — proceso falla si no cumple', <Badge color="teal">OWASP A02:2021</Badge>],
              ['Control de acceso por rol', 'Middleware requireAuth + requireAdmin en todos los endpoints sensibles', <Badge color="teal">OWASP A01:2021</Badge>],
              ['Inyección SQL', 'Parameterized queries (pg) en todas las consultas — sin concatenación', <Badge color="teal">OWASP A03:2021</Badge>],
              ['Formula injection (Excel)', "Prefijo ' en valores que inician con =+−@|% en exportación", <Badge color="teal">OWASP A03:2021</Badge>],
              ['Límites de entrada', 'observaciones max 2000 chars · comentarios max 1000 · limit max 100 rows', <Badge color="teal">OWASP A03:2021</Badge>],
              ['Auditoría de accesos', 'auth_log: evento, IP, user-agent, timestamp — login/logout/login_failed', <Badge color="teal">OWASP A09:2021</Badge>],
              ['Inactividad de sesión', 'Cierre automático configurable (default 20 min)', <Badge color="teal">OWASP A07:2021</Badge>],
              ['Error handling', 'Mensajes genéricos al cliente; detalle interno solo en logs de servidor', <Badge color="teal">OWASP A05:2021</Badge>],
              ['Contenedor no-root', 'Docker: USER node + chown /app — proceso sin privilegios de root', <Badge color="teal">CIS Docker Benchmark</Badge>],
              ['Almacenamiento de media', 'Fotos y firmas en base64 en BD (no filesystem efímero de Railway)', <Badge color="teal">Disponibilidad</Badge>],
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
              [<Badge color="blue">GET</Badge>, '/api/exportar/revisiones', <Badge color="amber">Admin</Badge>, 'Exportar Excel de revisiones con filtro por fecha'],
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
            ]}
          />
        </Section>

        {/* ── 08 BASE DE DATOS ── */}
        <Section num={8} title="Esquema de Base de Datos">
          <Table
            headers={['Tabla', 'Propósito', 'Columnas clave']}
            rows={[
              ['app_users', 'Cuentas de acceso al sistema', 'id · username · password_hash · rol · is_active · last_login'],
              ['empleados', 'Catálogo de empleados OXXO', 'id · numero_empleado (UNIQUE) · nombre_completo · posicion · plaza · region'],
              ['herramientas', 'Catálogo MAF (autos y equipo de cómputo)', 'id · tipo · codigo_barras · no_activo · marca · modelo · serie · plaza · empleado_id'],
              ['revisiones', 'Registro maestro de auditorías', 'id (SICH folio) · empleado_id · app_user_id · auditor_nombre · fecha_revision · tiene_auto · tiene_equipo'],
              ['revision_auto', 'Datos de revisión de vehículo', 'revision_id · herramienta_id · placas · no_serie · kilometraje · firmas (base64) · fotos (base64) · danos (JSONB)'],
              ['revision_equipo', 'Datos de revisión de equipo de cómputo', 'revision_id · herramienta_id · codigo_barras · marca · modelo · serie · foto · firmas (base64)'],
              ['app_config', 'Configuración del sistema', 'key (PK) · value — inactivity_minutes · ciudad_revision · nombre/firma_responsable_rh'],
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
              ['06', 'Firmas digitales', 'Captura de firma del empleado y firma del auditor en canvas táctil. La firma del Responsable de RH se inyecta automáticamente desde configuración.'],
              ['07', 'Resumen y confirmación', 'Vista previa completa de todos los datos antes de guardar. El auditor puede regresar a cualquier paso.'],
              ['08', 'Registro en base de datos', 'Transacción atómica: INSERT en revisiones + revision_auto / revision_equipo. Asignación de folio SICH-XXXXXX.'],
              ['09', 'Generación de carta responsiva', 'Documento PDF de 2 páginas con firmas digitales integradas, datos de la unidad, folio SICH y hash SHA-256.'],
              ['10', 'Verificación de autenticidad', 'Endpoint público /verificar/:id permite validar la autenticidad e integridad del documento mediante el folio o QR.'],
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
              ['Firma Responsable RH', <span className="font-mono">firma_responsable_rh</span>, '—', 'Firma digital del RH (base64 JPEG). Se inyecta automáticamente en todas las cartas. Bloquea nuevas revisiones si no está configurada.', <Badge color="red">Sí</Badge>],
            ]}
          />
          <p className="text-[10px] text-gray-500 mt-2">
            * Los tres parámetros marcados como requeridos son validados en el módulo de Nueva Revisión. El sistema muestra una pantalla de bloqueo con enlace a Configuración si alguno falta.
          </p>
        </Section>

        {/* ── 11 ESTADÍSTICAS ── */}
        <Section num={11} title="Estadísticas Actuales del Sistema">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
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

        {/* PIE DE PÁGINA */}
        <div className="border-t-2 border-[#134e4a] pt-4 mt-8 flex items-center justify-between text-[10px] text-gray-400">
          <span>SICH v{info?.version ?? '2.5.0'} · Cadena Comercial OXXO, S.A. de C.V. · Uso interno — Confidencial</span>
          <span>Generado: {today}</span>
        </div>
      </div>

      <style>{`
        @media print {
          .print-section { page-break-inside: avoid; }
          body { font-size: 11px; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </div>
  );
}
