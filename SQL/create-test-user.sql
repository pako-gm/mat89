-- ============================================
-- SCRIPT: Crear usuario de prueba
-- ============================================
-- Crea un usuario de prueba para validar la migración
-- ============================================

-- IMPORTANTE: Primero debes crear el usuario en Auth de Supabase
-- Ve a: Authentication > Users > Add user
-- O ejecuta este script que usa una función de Supabase

-- Opción 1: Insertar usuario directamente en user_profiles
-- (Requiere que el usuario ya exista en auth.users)

-- Ejemplo: Insertar un perfil de administrador
INSERT INTO user_profiles (
  user_id,
  nombre_usuario,
  email,
  user_role,
  status,
  ambito_almacenes
) VALUES (
  'UUID-DEL-USUARIO-DE-AUTH', -- Reemplaza con el UUID real del usuario de auth.users
  'Administrador Test',
  'admin@renfe.es',
  'ADMINISTRADOR',
  true,  -- ⬅️ USANDO BOOLEAN: true = ACTIVO
  '{}'
);

-- ============================================
-- Opción 2: Verificar usuarios existentes en auth
-- ============================================

-- Ver usuarios en auth.users que NO tienen perfil
SELECT
  au.id,
  au.email,
  au.created_at,
  CASE
    WHEN up.user_id IS NULL THEN '❌ Sin perfil'
    ELSE '✅ Tiene perfil'
  END as estado_perfil
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.created_at DESC;

-- ============================================
-- Opción 3: Actualizar usuarios existentes
-- ============================================

-- Si ya tienes usuarios, activar los administradores
UPDATE user_profiles
SET status = true
WHERE user_role = 'ADMINISTRADOR';

-- Ver el resultado
SELECT
  email,
  user_role,
  status,
  CASE
    WHEN status = true THEN '✅ ACTIVO'
    WHEN status = false THEN '❌ INACTIVO'
  END as estado_legible
FROM user_profiles
ORDER BY user_role DESC, email;

-- ============================================
-- PRUEBA: Cambiar status de un usuario
-- ============================================

-- Inactivar un usuario específico
-- UPDATE user_profiles
-- SET status = false
-- WHERE email = 'usuario@renfe.es';

-- Activar un usuario específico
-- UPDATE user_profiles
-- SET status = true
-- WHERE email = 'usuario@renfe.es';

-- ============================================
-- NOTAS
-- ============================================
-- ✅ status = true  → Usuario ACTIVO (puede acceder)
-- ❌ status = false → Usuario INACTIVO (acceso denegado)
-- ============================================
