-- ============================================
-- SCRIPT: Actualizar políticas RLS después del rename
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Las políticas RLS deben usar 'user_id' para
--              comparar con auth.uid(), no 'id'
-- ============================================

BEGIN;

-- PASO 1: Ver políticas actuales
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- PASO 2: Eliminar políticas antiguas que usan 'id'
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- PASO 3: Recrear políticas usando 'user_id' en lugar de 'id'

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Política: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Política: Los administradores pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = 'ACTIVO'
    )
  );

-- Política: Los administradores pueden actualizar todos los perfiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = 'ACTIVO'
    )
  );

-- Política: Los administradores pueden insertar perfiles
CREATE POLICY "Admins can insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = 'ACTIVO'
    )
  );

-- Política: Los administradores pueden eliminar perfiles
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = 'ACTIVO'
    )
  );

-- PASO 4: Verificar políticas recreadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

COMMIT;

-- ============================================
-- RESULTADOS ESPERADOS
-- ============================================
-- Deberías ver 6 políticas:
-- 1. Admins can delete profiles (DELETE)
-- 2. Admins can insert profiles (INSERT)
-- 3. Admins can update all profiles (UPDATE)
-- 4. Admins can view all profiles (SELECT)
-- 5. Users can update own profile (UPDATE)
-- 6. Users can view own profile (SELECT)
-- ============================================
