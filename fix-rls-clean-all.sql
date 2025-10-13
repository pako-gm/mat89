-- ============================================
-- SCRIPT LIMPIEZA COMPLETA: Eliminar TODAS las políticas duplicadas
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Paso 1: Desactivar RLS temporalmente
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Paso 2: Eliminar ABSOLUTAMENTE TODAS las políticas de user_profiles
DO $$
DECLARE
  pol record;
BEGIN
  RAISE NOTICE '🧹 Limpiando TODAS las políticas de user_profiles...';

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_profiles', pol.policyname);
    RAISE NOTICE '❌ Eliminada: %', pol.policyname;
  END LOOP;

  RAISE NOTICE '✅ Todas las políticas eliminadas';
END $$;

-- Paso 3: Verificar que no quedan políticas
SELECT COUNT(*) as "Políticas Restantes (debe ser 0)"
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Paso 4: Crear o reemplazar función helper
DROP FUNCTION IF EXISTS public.is_admin();

CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
COMMENT ON FUNCTION public.is_admin() IS 'Check if current user is administrator without RLS recursion';

-- Paso 5: Reactivar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Paso 6: Crear SOLO 7 políticas (sin duplicados)

-- 1. Usuarios leen su propio perfil
CREATE POLICY "users_read_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Administradores leen todos los perfiles
CREATE POLICY "admins_read_all"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 3. Usuarios insertan su propio perfil (registro)
CREATE POLICY "users_insert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Administradores insertan cualquier perfil
CREATE POLICY "admins_insert_any"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- 5. Usuarios actualizan su propio perfil
CREATE POLICY "users_update_own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 6. Administradores actualizan todos los perfiles
CREATE POLICY "admins_update_all"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- 7. Administradores eliminan perfiles
CREATE POLICY "admins_delete_any"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- ✅ VERIFICACIÓN FINAL
-- ============================================

-- Debería mostrar exactamente 7 políticas
SELECT
  policyname as "Política",
  cmd as "Comando",
  roles as "Roles"
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- Resultado esperado: 7 filas con nombres simples (users_*, admins_*)
