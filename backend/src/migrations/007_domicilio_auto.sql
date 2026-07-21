-- Migración 007: agrega domicilio y código postal del empleado auditado en revisión auto
ALTER TABLE revision_auto
  ADD COLUMN IF NOT EXISTS domicilio TEXT,
  ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
