-- Migración 008: nombre y firma del responsable de RH en carta compromiso auto
ALTER TABLE revision_auto
  ADD COLUMN IF NOT EXISTS nombre_responsable_rh VARCHAR(200),
  ADD COLUMN IF NOT EXISTS firma_responsable_rh TEXT;
