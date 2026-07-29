-- Permite revisiones sin firma del Responsable de RH (modo opcional)
ALTER TABLE revisiones ADD COLUMN IF NOT EXISTS firma_rh_pendiente BOOLEAN DEFAULT false;

-- Config: firma_rh_opcional (string 'true'/'false')
INSERT INTO app_config(key, value) VALUES('firma_rh_opcional', 'false')
  ON CONFLICT (key) DO NOTHING;
