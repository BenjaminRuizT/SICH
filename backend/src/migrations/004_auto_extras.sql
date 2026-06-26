ALTER TABLE revision_auto
  ADD COLUMN IF NOT EXISTS no_modelo            TEXT,
  ADD COLUMN IF NOT EXISTS gato_cruceta         BOOLEAN,
  ADD COLUMN IF NOT EXISTS foto_licencia_reverso TEXT;
