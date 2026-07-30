ALTER TABLE app_users ADD COLUMN IF NOT EXISTS can_reabrir_revision BOOLEAN DEFAULT false;
