-- Default inactivity timeout (minutes)
INSERT INTO app_config(key, value) VALUES('inactivity_minutes', '20') ON CONFLICT DO NOTHING;

-- Account lockout table (persistent, survives server restarts)
CREATE TABLE IF NOT EXISTS login_attempts (
  username     VARCHAR(50) PRIMARY KEY,
  count        INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
