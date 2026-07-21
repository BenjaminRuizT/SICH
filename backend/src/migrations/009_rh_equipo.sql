-- Migración 009: nombre y firma del responsable de RH en carta responsiva equipo
ALTER TABLE revision_equipo
  ADD COLUMN IF NOT EXISTS nombre_responsable_rh VARCHAR(200),
  ADD COLUMN IF NOT EXISTS firma_responsable_rh TEXT;
