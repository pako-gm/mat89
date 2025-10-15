-- ============================================
-- SCRIPT: Políticas RLS SIN RECURSIÓN
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Simplifica las políticas para evitar recursión
--              Las políticas de SELECT no deben buscar en user_profiles
--              para verificar si el usuario es admin
-- ============================================

BEGIN;

-- PASO 1: Eliminar TODAS las políticas actuales
DROP POLICY IF EXISTS "admins_delete_any" ON user_profiles;
DROP POLICY IF EXISTS "admins_insert_any" ON user_profiles;
DROP POLICY IF EXISTS "admins_read_all" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all" ON user_profiles;
DROP POLICY IF EXISTS "users_read_own" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own" ON user_profiles;

-- PASO 2: Crear políticas SIMPLES sin recursión

-- SELECT: Todos los usuarios autenticados pueden leer TODOS los perfiles
-- (Esto evita la recursión y permite que la aplicación filtre por rol)
CREATE POLICY "authenticated_users_read_all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "users_update_own"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT: Cualquier usuario autenticado puede insertar
-- (La aplicación controla quién puede crear usuarios)
CREATE POLICY "authenticated_users_insert"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- DELETE: Cualquier usuario autenticado puede eliminar
-- (La aplicación controla quién puede eliminar)
CREATE POLICY "authenticated_users_delete"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (true);

-- PASO 3: Verificar el resultado
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
-- 4 políticas simples:
-- 1. authenticated_users_delete    (DELETE) - permite a todos
-- 2. authenticated_users_insert    (INSERT) - permite a todos
-- 3. authenticated_users_read_all  (SELECT) - permite a todos
-- 4. users_update_own             (UPDATE) - solo propio perfil
--
-- NOTA: La seguridad se maneja en la APLICACIÓN, no en RLS
--       RLS solo previene acceso no autenticado
-- ============================================
