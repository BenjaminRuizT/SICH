ALTER TABLE revision_auto
  ADD COLUMN IF NOT EXISTS danos JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS firma_empleado TEXT,
  ADD COLUMN IF NOT EXISTS firma_auditor TEXT;

ALTER TABLE revision_equipo
  ADD COLUMN IF NOT EXISTS danos JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS firma_empleado TEXT,
  ADD COLUMN IF NOT EXISTS firma_auditor TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_herramientas_no_activo
  ON herramientas(no_activo)
  WHERE no_activo IS NOT NULL AND no_activo <> '';
