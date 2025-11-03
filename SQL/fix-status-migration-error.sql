-- ============================================
-- SCRIPT DE RECUPERACIÓN: Fix de migración STATUS
-- ============================================
-- Este script corrige el error de dependencia de políticas
-- cuando ya se ejecutaron los pasos 1-4 de la migración
-- ============================================

-- IMPORTANTE: Ejecuta este script si obtuviste el error:
-- "cannot drop column status because other objects depend on it"

BEGIN;

-- ============================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- ============================================

-- Ver las columnas actuales de user_profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('status', 'status_new')
ORDER BY column_name;

-- ============================================
-- PASO 2: ELIMINAR POLÍTICAS QUE DEPENDEN DE STATUS
-- ============================================

-- Eliminar políticas de tbl_almacenes que usan la columna status
DROP POLICY IF EXISTS "Administradores pueden gestionar almacenes" ON tbl_almacenes;
DROP POLICY IF EXISTS "Usuarios EDICION pueden ver almacenes" ON tbl_almacenes;
DROP POLICY IF EXISTS "Usuarios CONSULTAS pueden ver almacenes" ON tbl_almacenes;

-- ============================================
-- PASO 3: AHORA SÍ PODEMOS ELIMINAR LA COLUMNA ANTIGUA
-- ============================================

-- Eliminar el índice antiguo (si existe)
DROP INDEX IF EXISTS idx_user_profiles_status;

-- Eliminar la columna antigua status (TEXT)
ALTER TABLE user_profiles DROP COLUMN status;

-- ============================================
-- PASO 4: RENOMBRAR LA NUEVA COLUMNA
-- ============================================

-- Renombrar status_new a status
ALTER TABLE user_profiles RENAME COLUMN status_new TO status;

-- ============================================
-- PASO 5: CREAR NUEVO ÍNDICE
-- ============================================

CREATE INDEX idx_user_profiles_status ON user_profiles(status);

-- ============================================
-- PASO 6: RECREAR POLÍTICAS CON EL NUEVO TIPO BOOLEAN
-- ============================================

-- Política para ADMINISTRADOR
CREATE POLICY "Administradores pueden gestionar almacenes"
  ON tbl_almacenes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true
    )
  );

-- Política para EDICION
CREATE POLICY "Usuarios EDICION pueden ver almacenes"
  ON tbl_almacenes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'EDICION'
      AND user_profiles.status = true
    )
  );

-- Política para CONSULTAS
CREATE POLICY "Usuarios CONSULTAS pueden ver almacenes"
  ON tbl_almacenes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'CONSULTAS'
      AND user_profiles.status = true
    )
  );

-- ============================================
-- PASO 7: DOCUMENTAR EL CAMBIO
-- ============================================

COMMENT ON COLUMN user_profiles.status IS 'Estado del usuario: true = ACTIVO, false = INACTIVO';

-- ============================================
-- PASO 8: VERIFICAR RESULTADO FINAL
-- ============================================

-- Ver la estructura final de la columna status
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'status';

-- Ver usuarios (si los hay)
SELECT
  email,
  user_role,
  status,
  CASE
    WHEN status = true THEN '✅ ACTIVO'
    WHEN status = false THEN '❌ INACTIVO'
  END as estado_legible
FROM user_profiles
ORDER BY user_role DESC, email
LIMIT 10;

-- Ver las políticas recreadas
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'tbl_almacenes'
ORDER BY policyname;

COMMIT;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- ✅ La columna status ahora es de tipo BOOLEAN
-- ✅ Valores: true = ACTIVO, false = INACTIVO
-- ✅ Políticas RLS recreadas correctamente
-- ============================================
