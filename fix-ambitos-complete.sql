-- ============================================
-- SCRIPT COMPLETO: Solucionar problema de ámbitos
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Corrige tanto RLS de tbl_almacenes como
--              la columna ambito_almacenes en user_profiles
-- ============================================

-- INSTRUCCIONES:
-- 1. Ve al panel de Supabase: https://mlisnngduwrlqxyjjibp.supabase.co
-- 2. Navega a "SQL Editor"
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script
-- 5. Verifica los resultados
-- 6. Recarga la aplicación y prueba

BEGIN;

-- ============================================
-- PARTE 1: Verificar y crear columna ambito_almacenes
-- ============================================

DO $$
BEGIN
  -- Verificar si la columna ambito_almacenes existe
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'ambito_almacenes'
  ) THEN
    -- Crear la columna si no existe
    ALTER TABLE public.user_profiles
    ADD COLUMN ambito_almacenes TEXT[] DEFAULT '{}';

    RAISE NOTICE '✅ Columna ambito_almacenes creada en user_profiles';
  ELSE
    RAISE NOTICE '✓ Columna ambito_almacenes ya existe en user_profiles';
  END IF;
END $$;

-- Agregar comentario a la columna
COMMENT ON COLUMN public.user_profiles.ambito_almacenes IS
  'Array de IDs de almacenes (UUID) a los que el usuario tiene acceso visual';

-- ============================================
-- PARTE 2: Configurar RLS para tbl_almacenes
-- ============================================

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

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS configuradas para tbl_almacenes';
END $$;

-- ============================================
-- PARTE 3: Verificar políticas de user_profiles
-- ============================================

-- Verificar que la función is_admin() existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Crear la función si no existe
    CREATE FUNCTION public.is_admin()
    RETURNS BOOLEAN
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $func$
      SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE user_id = auth.uid()
        AND user_role = 'ADMINISTRADOR'
      );
    $func$;

    GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

    COMMENT ON FUNCTION public.is_admin() IS
      'Helper function to check if current user is an administrator. Uses SECURITY DEFINER to avoid recursion.';

    RAISE NOTICE '✅ Función is_admin() creada';
  ELSE
    RAISE NOTICE '✓ Función is_admin() ya existe';
  END IF;
END $$;

-- Verificar que existen políticas de UPDATE para administradores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
    AND policyname = 'Admins can update all profiles'
  ) THEN
    -- Crear política de UPDATE para administradores
    CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

    RAISE NOTICE '✅ Política "Admins can update all profiles" creada';
  ELSE
    RAISE NOTICE '✓ Política "Admins can update all profiles" ya existe';
  END IF;
END $$;

-- ============================================
-- PARTE 4: Verificaciones finales
-- ============================================

-- Verificar columna ambito_almacenes
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
AND column_name = 'ambito_almacenes';

-- Verificar políticas de tbl_almacenes
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'tbl_almacenes'
ORDER BY policyname;

-- Verificar políticas de user_profiles relacionadas con UPDATE
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
AND cmd IN ('UPDATE', 'ALL')
ORDER BY policyname;

-- Verificar función is_admin
SELECT
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'is_admin';

-- Mensaje final de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Script completado exitosamente. Recarga la aplicación y prueba el modal de ámbitos.';
END $$;

COMMIT;

-- ============================================
-- RESULTADOS ESPERADOS
-- ============================================
-- 1. Columna ambito_almacenes existe en user_profiles (tipo ARRAY)
-- 2. tbl_almacenes tiene 2 políticas:
--    - "Usuarios autenticados pueden ver almacenes" (SELECT)
--    - "Administradores pueden gestionar almacenes" (ALL)
-- 3. user_profiles tiene política de UPDATE para administradores
-- 4. Función is_admin() existe y está disponible
-- ============================================