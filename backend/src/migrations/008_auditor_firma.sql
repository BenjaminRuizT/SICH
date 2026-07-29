-- Firma personal del auditor (pre-cargada, cifrada AES-256-GCM)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS firma TEXT;
