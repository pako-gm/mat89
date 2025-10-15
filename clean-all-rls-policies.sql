-- ============================================
-- SCRIPT: LIMPIAR TODAS las políticas RLS duplicadas
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Elimina todas las políticas y crea un conjunto limpio
-- ============================================

BEGIN;

-- PASO 1: Eliminar TODAS las políticas existentes (ambos grupos)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

DROP POLICY IF EXISTS "admins_delete_any" ON user_profiles;
DROP POLICY IF EXISTS "admins_insert_any" ON user_profiles;
DROP POLICY IF EXISTS "admins_read_all" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all" ON user_profiles;
DROP POLICY IF EXISTS "users_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "users_read_own" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own" ON user_profiles;

-- PASO 2: Verificar que no queden políticas
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles';

-- PASO 3: Crear UN SOLO conjunto de políticas LIMPIO usando user_id

-- SELECT: Los usuarios pueden ver su propio perfil
CREATE POLICY "users_read_own"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: Los administradores pueden ver todos los perfiles
CREATE POLICY "admins_read_all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
    )
  );

-- UPDATE: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "users_update_own"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Los administradores pueden actualizar todos los perfiles
CREATE POLICY "admins_update_all"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
    )
  );

-- INSERT: Los administradores pueden insertar perfiles
CREATE POLICY "admins_insert_any"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
    )
  );

-- DELETE: Los administradores pueden eliminar perfiles
CREATE POLICY "admins_delete_any"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
    )
  );

-- PASO 4: Verificar el resultado final
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

COMMIT;

-- ============================================
-- RESULTADOS ESPERADOS
-- ============================================
-- Exactamente 6 políticas:
-- 1. admins_delete_any    (DELETE)
-- 2. admins_insert_any    (INSERT)
-- 3. admins_read_all      (SELECT)
-- 4. admins_update_all    (UPDATE)
-- 5. users_read_own       (SELECT)
-- 6. users_update_own     (UPDATE)
-- ============================================
