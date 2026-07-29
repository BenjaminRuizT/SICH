INSERT INTO app_config(key, value) VALUES('exportar_responsivas_roles', 'admin') ON CONFLICT (key) DO NOTHING;
