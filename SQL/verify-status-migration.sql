-- ============================================
-- SCRIPT DE VERIFICACIÓN: Estado de la migración STATUS
-- ============================================

-- 1. Verificar la estructura de la columna status
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'status';

-- 2. Verificar que NO existe la columna antigua status_new
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('status', 'status_new')
ORDER BY column_name;

-- 3. Ver todas las políticas de tbl_almacenes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'tbl_almacenes'
ORDER BY policyname;

-- 4. Verificar usuarios (si los hay)
SELECT
  email,
  user_role,
  status,
  CASE
    WHEN status = true THEN '✅ ACTIVO'
    WHEN status = false THEN '❌ INACTIVO'
  END as estado_legible,
  created_at
FROM user_profiles
ORDER BY user_role DESC, email;

-- 5. Verificar el índice
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
AND indexname LIKE '%status%';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ column_name: status
-- ✅ data_type: boolean
-- ✅ is_nullable: NO
-- ✅ column_default: false
-- ✅ NO debe existir la columna status_new
-- ✅ 4 políticas en tbl_almacenes
-- ============================================
