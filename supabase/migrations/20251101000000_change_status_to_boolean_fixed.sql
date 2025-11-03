-- Migración para cambiar el campo STATUS de TEXT a BOOLEAN
-- true = ACTIVO, false = INACTIVO
-- VERSIÓN CORREGIDA: Elimina políticas ANTES de modificar la columna

-- ============================================
-- PASO 1: ELIMINAR POLÍTICAS QUE DEPENDEN DE STATUS
-- ============================================

-- Eliminar políticas de tbl_almacenes
DROP POLICY IF EXISTS "Administradores pueden gestionar almacenes" ON tbl_almacenes;
DROP POLICY IF EXISTS "Usuarios EDICION pueden ver almacenes" ON tbl_almacenes;
DROP POLICY IF EXISTS "Usuarios CONSULTAS pueden ver almacenes" ON tbl_almacenes;

-- Eliminar cualquier otra política que pueda depender del status
-- (Añade aquí otras políticas si las hay)

-- ============================================
-- PASO 2: MODIFICAR LA COLUMNA STATUS
-- ============================================

-- 2.1: Agregar columna temporal booleana
ALTER TABLE user_profiles
ADD COLUMN status_new BOOLEAN;

-- 2.2: Migrar datos existentes
-- ACTIVO -> true, INACTIVO -> false, PENDIENTE -> false
UPDATE user_profiles
SET status_new = CASE
  WHEN UPPER(status) = 'ACTIVO' THEN true
  ELSE false
END;

-- 2.3: Hacer la columna NOT NULL con valor por defecto
ALTER TABLE user_profiles
ALTER COLUMN status_new SET NOT NULL,
ALTER COLUMN status_new SET DEFAULT false;

-- 2.4: Eliminar el índice antiguo
DROP INDEX IF EXISTS idx_user_profiles_status;

-- 2.5: Eliminar la columna antigua
ALTER TABLE user_profiles
DROP COLUMN status;

-- 2.6: Renombrar la nueva columna
ALTER TABLE user_profiles
RENAME COLUMN status_new TO status;

-- 2.7: Crear nuevo índice
CREATE INDEX idx_user_profiles_status ON user_profiles(status);

-- ============================================
-- PASO 3: RECREAR POLÍTICAS CON EL NUEVO TIPO
-- ============================================

-- Política para tbl_almacenes (ADMINISTRADOR)
CREATE POLICY "Administradores pueden gestionar almacenes"
  ON tbl_almacenes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true  -- Ahora usa boolean
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true  -- Ahora usa boolean
    )
  );

-- Política para usuarios con rol EDICION
CREATE POLICY "Usuarios EDICION pueden ver almacenes"
  ON tbl_almacenes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'EDICION'
      AND user_profiles.status = true  -- Ahora usa boolean
    )
  );

-- Política para usuarios con rol CONSULTAS
CREATE POLICY "Usuarios CONSULTAS pueden ver almacenes"
  ON tbl_almacenes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'CONSULTAS'
      AND user_profiles.status = true  -- Ahora usa boolean
    )
  );

-- ============================================
-- PASO 4: DOCUMENTAR EL CAMBIO
-- ============================================

COMMENT ON COLUMN user_profiles.status IS 'Estado del usuario: true = ACTIVO, false = INACTIVO';

-- ============================================
-- PASO 5: VERIFICAR EL RESULTADO
-- ============================================

-- Ver la estructura de la columna
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'status';

-- Ver algunos usuarios (si los hay)
SELECT
  email,
  user_role,
  status,
  CASE
    WHEN status = true THEN 'ACTIVO'
    WHEN status = false THEN 'INACTIVO'
  END as status_legible
FROM user_profiles
LIMIT 10;
