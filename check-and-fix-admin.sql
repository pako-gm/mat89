-- ============================================
-- SCRIPT: Verificar y corregir usuario administrador
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Verifica que el usuario actual esté correctamente
--              vinculado y tenga rol de administrador
-- ============================================

-- PASO 1: Ver tu usuario actual en auth.users
SELECT
  id as auth_user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at;

-- PASO 2: Ver todos los perfiles en user_profiles
SELECT
  id as profile_id,
  user_id,
  email,
  user_role,
  status,
  created_at
FROM user_profiles
ORDER BY created_at;

-- PASO 3: Ver si hay desconexión entre auth.users y user_profiles
SELECT
  au.id as auth_id,
  au.email as auth_email,
  up.id as profile_id,
  up.user_id as profile_user_id,
  up.email as profile_email,
  up.user_role,
  up.status,
  CASE
    WHEN au.id = up.user_id THEN '✅ Vinculado'
    ELSE '❌ NO vinculado'
  END as estado_vinculacion
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.created_at;

-- PASO 4: Contar cuántos administradores hay
SELECT
  user_role,
  status,
  COUNT(*) as cantidad
FROM user_profiles
GROUP BY user_role, status
ORDER BY user_role;

-- ============================================
-- INSTRUCCIONES DESPUÉS DE VER LOS RESULTADOS
-- ============================================
-- Si ves que tu usuario NO está vinculado:
-- 1. Anota tu auth_user_id (de auth.users)
-- 2. Encuentra el profile_id que tiene tu email
-- 3. Ejecuta este UPDATE (reemplaza los IDs):
--
-- UPDATE user_profiles
-- SET user_id = 'TU_AUTH_USER_ID_AQUI'
-- WHERE email = 'TU_EMAIL_AQUI';
--
-- Si tu usuario no tiene rol ADMINISTRADOR:
--
-- UPDATE user_profiles
-- SET user_role = 'ADMINISTRADOR',
--     status = 'ACTIVO'
-- WHERE email = 'TU_EMAIL_AQUI';
-- ============================================
