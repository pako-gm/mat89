-- ============================================
-- SCRIPT RÁPIDO: Corregir Recursión RLS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Desactivar RLS temporalmente
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;

-- 3. Crear función helper (evita recursión)
CREATE OR REPLACE FUNCTION public.is_admin()
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

-- 4. Reactivar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Crear nuevas políticas SIN recursión

-- Usuarios pueden leer su propio perfil
CREATE POLICY "Users can read own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins pueden leer todos los perfiles
CREATE POLICY "Admins can read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Usuarios pueden insertar su propio perfil (registro)
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins pueden insertar cualquier perfil
CREATE POLICY "Admins can insert profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Admins pueden actualizar todos los perfiles
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Admins pueden eliminar perfiles
CREATE POLICY "Admins can delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- ✅ LISTO! Políticas corregidas
-- ============================================

-- Verificar que funcionó:
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Debería mostrar: 7 políticas
