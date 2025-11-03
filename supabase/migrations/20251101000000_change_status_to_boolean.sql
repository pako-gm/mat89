-- Migración para cambiar el campo STATUS de TEXT a BOOLEAN
-- true = ACTIVO, false = INACTIVO

-- Paso 1: Agregar columna temporal booleana
ALTER TABLE user_profiles
ADD COLUMN status_new BOOLEAN;

-- Paso 2: Migrar datos existentes
-- ACTIVO -> true, INACTIVO -> false, PENDIENTE -> false (por defecto los pendientes se marcan como inactivos)
UPDATE user_profiles
SET status_new = CASE
  WHEN UPPER(status) = 'ACTIVO' THEN true
  ELSE false
END;

-- Paso 3: Hacer la columna NOT NULL con valor por defecto
ALTER TABLE user_profiles
ALTER COLUMN status_new SET NOT NULL,
ALTER COLUMN status_new SET DEFAULT false;

-- Paso 4: Eliminar el índice antiguo
DROP INDEX IF EXISTS idx_user_profiles_status;

-- Paso 5: Eliminar la columna antigua
ALTER TABLE user_profiles
DROP COLUMN status;

-- Paso 6: Renombrar la nueva columna
ALTER TABLE user_profiles
RENAME COLUMN status_new TO status;

-- Paso 7: Crear nuevo índice
CREATE INDEX idx_user_profiles_status ON user_profiles(status);

-- Paso 8: Actualizar las políticas RLS que usan el campo status
-- Primero eliminamos las políticas existentes que dependen del status

-- Política para tbl_almacenes (ADMINISTRADOR)
DROP POLICY IF EXISTS "Administradores pueden gestionar almacenes" ON tbl_almacenes;

CREATE POLICY "Administradores pueden gestionar almacenes"
  ON tbl_almacenes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true  -- Cambiado de 'ACTIVO' a true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true  -- Cambiado de 'ACTIVO' a true
    )
  );

-- Política para usuarios con rol EDICION
DROP POLICY IF EXISTS "Usuarios EDICION pueden ver almacenes" ON tbl_almacenes;

CREATE POLICY "Usuarios EDICION pueden ver almacenes"
  ON tbl_almacenes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'EDICION'
      AND user_profiles.status = true  -- Cambiado de 'ACTIVO' a true
    )
  );

-- Política para usuarios con rol CONSULTAS
DROP POLICY IF EXISTS "Usuarios CONSULTAS pueden ver almacenes" ON tbl_almacenes;

CREATE POLICY "Usuarios CONSULTAS pueden ver almacenes"
  ON tbl_almacenes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'CONSULTAS'
      AND user_profiles.status = true  -- Cambiado de 'ACTIVO' a true
    )
  );

-- Comentario en la tabla para documentar el cambio
COMMENT ON COLUMN user_profiles.status IS 'Estado del usuario: true = ACTIVO, false = INACTIVO';
