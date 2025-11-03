-- ============================================
-- SCRIPT: Activar usuarios administradores
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Pone status='ACTIVO' a los administradores
-- ============================================

BEGIN;

-- Actualizar todos los administradores con status NULL a ACTIVO
UPDATE user_profiles
SET status = 'ACTIVO'
WHERE user_role = 'ADMINISTRADOR'
AND status IS NULL;

-- Actualizar también los demás usuarios sin status
UPDATE user_profiles
SET status = 'ACTIVO'
WHERE status IS NULL;

-- Verificar el resultado
SELECT
  email,
  user_role,
  status,
  CASE
    WHEN user_role = 'ADMINISTRADOR' AND status = 'ACTIVO' THEN '✅ Admin ACTIVO'
    WHEN status = 'ACTIVO' THEN '✅ Usuario ACTIVO'
    ELSE '⚠️ Revisar'
  END as estado
FROM user_profiles
ORDER BY user_role DESC, email;

COMMIT;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Todos los usuarios (especialmente administradores)
-- deben tener status = 'ACTIVO'
-- ============================================
