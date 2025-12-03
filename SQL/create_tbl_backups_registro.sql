-- =============================================
-- Tabla: tbl_backups_registro
-- Descripción: Registro de backups realizados del sistema
-- Fecha de creación: 2025-12-01
-- Rama: BACKUP-DATOS
-- =============================================

-- Crear tabla tbl_backups_registro
CREATE TABLE IF NOT EXISTS tbl_backups_registro (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_archivo TEXT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  tamano_kb INTEGER NOT NULL DEFAULT 0,
  tablas_incluidas INTEGER NOT NULL DEFAULT 0,
  registros_totales INTEGER NOT NULL DEFAULT 0,
  usuario_creador TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('manual', 'automatico')),
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_backups_fecha_creacion ON tbl_backups_registro(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_backups_usuario_creador ON tbl_backups_registro(usuario_creador);
CREATE INDEX IF NOT EXISTS idx_backups_tipo ON tbl_backups_registro(tipo);

-- Habilitar Row Level Security (RLS)
ALTER TABLE tbl_backups_registro ENABLE ROW LEVEL SECURITY;

-- Política: Solo administradores pueden ver backups
CREATE POLICY "Administradores pueden ver backups"
  ON tbl_backups_registro
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
    )
  );

-- Política: Solo administradores pueden insertar backups
CREATE POLICY "Administradores pueden crear backups"
  ON tbl_backups_registro
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
    )
  );

-- Política: Solo administradores pueden eliminar backups
CREATE POLICY "Administradores pueden eliminar backups"
  ON tbl_backups_registro
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
    )
  );

-- Política: Solo administradores pueden actualizar backups
CREATE POLICY "Administradores pueden actualizar backups"
  ON tbl_backups_registro
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
    )
  );

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_tbl_backups_registro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER trg_update_tbl_backups_registro_updated_at
  BEFORE UPDATE ON tbl_backups_registro
  FOR EACH ROW
  EXECUTE FUNCTION update_tbl_backups_registro_updated_at();

-- Comentarios en la tabla y columnas
COMMENT ON TABLE tbl_backups_registro IS 'Registro de backups realizados del sistema MAT89';
COMMENT ON COLUMN tbl_backups_registro.id IS 'Identificador único del backup';
COMMENT ON COLUMN tbl_backups_registro.nombre_archivo IS 'Nombre del archivo de backup generado';
COMMENT ON COLUMN tbl_backups_registro.fecha_creacion IS 'Fecha y hora de creación del backup';
COMMENT ON COLUMN tbl_backups_registro.tamano_kb IS 'Tamaño del archivo de backup en kilobytes';
COMMENT ON COLUMN tbl_backups_registro.tablas_incluidas IS 'Número de tablas incluidas en el backup';
COMMENT ON COLUMN tbl_backups_registro.registros_totales IS 'Número total de registros respaldados';
COMMENT ON COLUMN tbl_backups_registro.usuario_creador IS 'Usuario que generó el backup';
COMMENT ON COLUMN tbl_backups_registro.tipo IS 'Tipo de backup: manual o automatico';
COMMENT ON COLUMN tbl_backups_registro.descripcion IS 'Descripción adicional del backup';

-- Insertar backup de ejemplo (opcional, comentar si no se desea)
-- INSERT INTO tbl_backups_registro (
--   nombre_archivo,
--   fecha_creacion,
--   tamano_kb,
--   tablas_incluidas,
--   registros_totales,
--   usuario_creador,
--   tipo,
--   descripcion
-- ) VALUES (
--   'backup_mat89_2025-12-01_initial.sql',
--   NOW(),
--   150,
--   8,
--   500,
--   'admin@sistema.com',
--   'manual',
--   'Backup inicial de prueba del sistema'
-- );

-- =============================================
-- FIN DE MIGRACIÓN
-- =============================================
