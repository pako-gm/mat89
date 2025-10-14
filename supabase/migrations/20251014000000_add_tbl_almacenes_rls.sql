/*
  # Agregar políticas RLS para tbl_almacenes

  1. Propósito
    - Permitir que todos los usuarios autenticados puedan leer los almacenes
    - Los almacenes son datos de catálogo necesarios para la gestión de ámbitos

  2. Cambios
    - Habilitar RLS en tbl_almacenes si no está habilitado
    - Crear política de SELECT para usuarios autenticados
    - Solo los administradores pueden modificar almacenes (INSERT, UPDATE, DELETE)

  3. Seguridad
    - Los usuarios solo necesitan leer los almacenes para asignar ámbitos
    - Las operaciones de modificación están restringidas a administradores
*/

-- Habilitar RLS en tbl_almacenes si no está habilitado
ALTER TABLE tbl_almacenes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver almacenes" ON tbl_almacenes;
DROP POLICY IF EXISTS "Administradores pueden gestionar almacenes" ON tbl_almacenes;

-- Política: Todos los usuarios autenticados pueden leer almacenes
CREATE POLICY "Usuarios autenticados pueden ver almacenes"
  ON tbl_almacenes
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo administradores pueden crear, actualizar y eliminar almacenes
CREATE POLICY "Administradores pueden gestionar almacenes"
  ON tbl_almacenes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = 'ACTIVO'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = 'ACTIVO'
    )
  );

-- Comentarios para documentación
COMMENT ON POLICY "Usuarios autenticados pueden ver almacenes" ON tbl_almacenes IS
  'Permite a todos los usuarios autenticados leer los almacenes para gestión de ámbitos';

COMMENT ON POLICY "Administradores pueden gestionar almacenes" ON tbl_almacenes IS
  'Solo administradores activos pueden crear, actualizar o eliminar almacenes';