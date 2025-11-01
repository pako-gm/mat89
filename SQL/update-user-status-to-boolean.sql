-- ============================================
-- SCRIPT: Actualizar status de usuarios a boolean
-- FECHA: 2025-11-01
-- DESCRIPCIÓN: Actualiza el status de usuarios después de migrar a boolean
-- ============================================

BEGIN;

-- Este script es útil si necesitas actualizar manualmente el status de usuarios
-- después de ejecutar la migración 20251101000000_change_status_to_boolean.sql

-- NOTA: La migración ya convierte automáticamente:
-- 'ACTIVO' -> true
-- 'INACTIVO' -> false
-- 'PENDIENTE' -> false

-- Puedes usar este script para ajustes manuales posteriores:

-- 1. Activar todos los administradores (si no están activos)
UPDATE user_profiles
SET status = true
WHERE user_role = 'ADMINISTRADOR'
AND status = false;

-- 2. Ver el estado actual de todos los usuarios
SELECT
  email,
  user_role,
  status,
  CASE
    WHEN status = true THEN '✅ ACTIVO'
    WHEN status = false THEN '❌ INACTIVO'
    ELSE '⚠️ NULL (error)'
  END as estado_legible
FROM user_profiles
ORDER BY user_role DESC, email;

COMMIT;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. El campo status ahora es BOOLEAN:
--    - true = ACTIVO
--    - false = INACTIVO
--
-- 2. NO existen más los valores 'PENDIENTE', 'ACTIVO' o 'INACTIVO' como texto
--
-- 3. El valor por defecto es false (INACTIVO)
--
-- 4. Para actualizar el status de un usuario:
--    UPDATE user_profiles SET status = true WHERE email = 'usuario@ejemplo.com';
-- ============================================
