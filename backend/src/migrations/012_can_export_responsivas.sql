ALTER TABLE app_users ADD COLUMN IF NOT EXISTS can_export_responsivas BOOLEAN DEFAULT false;
UPDATE app_users SET can_export_responsivas = true WHERE rol = 'admin';
