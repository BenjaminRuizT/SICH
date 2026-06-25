CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin','auditor')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS empleados (
  id SERIAL PRIMARY KEY,
  numero_empleado VARCHAR(20) UNIQUE NOT NULL,
  nombre_completo VARCHAR(200) NOT NULL,
  posicion VARCHAR(150),
  departamento VARCHAR(100),
  plaza VARCHAR(50),
  region VARCHAR(50) DEFAULT 'Tijuana',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_empleados_numero ON empleados(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_empleados_nombre ON empleados(LOWER(nombre_completo));

CREATE TABLE IF NOT EXISTS herramientas (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('auto','laptop','computo')),
  codigo_barras VARCHAR(50),
  no_activo VARCHAR(50),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  anio INTEGER,
  serie VARCHAR(150),
  descripcion_maf VARCHAR(150),
  plaza VARCHAR(50),
  plaza_desc VARCHAR(100),
  empleado_id INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  asignado_a_raw VARCHAR(200),
  desc_puesto VARCHAR(150),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_herramientas_cb ON herramientas(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_herramientas_empleado ON herramientas(empleado_id);

CREATE TABLE IF NOT EXISTS revisiones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER REFERENCES empleados(id),
  empleado_snapshot JSONB NOT NULL,
  app_user_id INTEGER REFERENCES app_users(id),
  auditor_nombre VARCHAR(100),
  fecha_revision TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(30) DEFAULT 'completada',
  tiene_auto BOOLEAN DEFAULT false,
  tiene_equipo BOOLEAN DEFAULT false,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revisiones_empleado ON revisiones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_revisiones_fecha ON revisiones(fecha_revision DESC);

CREATE TABLE IF NOT EXISTS revision_auto (
  id SERIAL PRIMARY KEY,
  revision_id INTEGER REFERENCES revisiones(id) ON DELETE CASCADE,
  herramienta_id INTEGER REFERENCES herramientas(id) ON DELETE SET NULL,
  herramienta_snapshot JSONB,
  no_serie VARCHAR(150),
  placas VARCHAR(30),
  codigo_barras VARCHAR(50),
  kilometraje INTEGER,
  poliza_seguro VARCHAR(100),
  licencia_numero VARCHAR(100),
  llanta_refaccion BOOLEAN,
  comentarios TEXT,
  foto_condiciones JSONB DEFAULT '[]',
  foto_licencia TEXT,
  foto_tarjeta_circulacion TEXT,
  firma_carta_responsiva TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revision_equipo (
  id SERIAL PRIMARY KEY,
  revision_id INTEGER REFERENCES revisiones(id) ON DELETE CASCADE,
  herramienta_id INTEGER REFERENCES herramientas(id) ON DELETE SET NULL,
  herramienta_snapshot JSONB,
  codigo_barras VARCHAR(50),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  serie VARCHAR(150),
  foto_equipo TEXT,
  comentarios TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_log (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50),
  app_user_id INTEGER,
  event VARCHAR(50),
  ip VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
