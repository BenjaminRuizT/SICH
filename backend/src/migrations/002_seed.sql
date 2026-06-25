INSERT INTO app_users (username, password_hash, nombre, rol)
VALUES ('admin', '$2b$10$PLACEHOLDER_REPLACED_AT_MIGRATE', 'Administrador', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO app_config (key, value) VALUES
  ('app_name', 'SICHE'),
  ('plazas', '["Región","Tijuana Centro","Tijuana Este","Playas","Ensenada","Oficinas Región"]'),
  ('departamentos', '["ADMINISTRATIVO","APERTURAS","RECLUTAMIENTO Y SELECCIÓN","CONSERVACIÓN","MERCADEO","RECURSOS HUMANOS","ADMON PERSONAL","PROCESOS OPERATIVOS","OPERACIONES","PROTECCIÓN PATRIMONIAL","MANTENIMIENTO","ENTRENAMIENTO","DLLO INFRAESTRUCTURA Y DISEÑO","PLAZA EMP"]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
