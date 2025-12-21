-- ============================================================================
-- FIX: Políticas RLS para tbl_backups_registro
-- Fecha: 2025-12-17
-- Problema: Error 403 al intentar guardar metadata de backup manual
-- Error: "new row violates row-level security policy for table tbl_backups_registro"
-- Causa: Las políticas RLS solo permiten inserts desde service_role (GitHub Actions)
--        pero bloquean inserts desde usuarios autenticados (backups manuales)
-- ============================================================================

-- Paso 1: Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Usuarios pueden ver sus backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver sus backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Administradores pueden ver todos los backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Administradores pueden eliminar backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Service role puede insertar backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Enable read access for all users" ON tbl_backups_registro;

-- Paso 2: Asegurar que RLS está habilitado
ALTER TABLE tbl_backups_registro ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NUEVAS POLÍTICAS QUE PERMITEN BACKUPS MANUALES Y AUTOMÁTICOS
-- ============================================================================

-- POLÍTICA 1: Permitir INSERT a TODOS los usuarios autenticados
-- Esto permite que cualquier usuario con sesión válida cree backups manuales
CREATE POLICY "authenticated_users_can_insert_backups"
ON tbl_backups_registro
FOR INSERT
TO authenticated
WITH CHECK (true);

-- POLÍTICA 2: Permitir SELECT solo a ADMINISTRADORES
-- Los administradores pueden ver todos los backups (tanto manuales como automáticos)
CREATE POLICY "admins_can_view_all_backups"
ON tbl_backups_registro
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_id = auth.uid()
        AND user_role = 'ADMINISTRADOR'
    )
);

-- POLÍTICA 3: Permitir DELETE solo a ADMINISTRADORES
-- Para limpiar backups antiguos si es necesario
CREATE POLICY "admins_can_delete_backups"
ON tbl_backups_registro
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_id = auth.uid()
        AND user_role = 'ADMINISTRADOR'
    )
);

-- ============================================================================
-- VERIFICACIÓN DE POLÍTICAS
-- ============================================================================

-- Ver todas las políticas activas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'tbl_backups_registro'
ORDER BY policyname;

-- ============================================================================
-- INFORMACIÓN ADICIONAL
-- ============================================================================

-- Verificar estructura de la tabla
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tbl_backups_registro'
ORDER BY ordinal_position;

-- ============================================================================
-- INSTRUCCIONES DE EJECUCIÓN:
-- ============================================================================
-- 1. Abrir Supabase Dashboard → SQL Editor
-- 2. Copiar y pegar este script completo
-- 3. Ejecutar (Run)
-- 4. Verificar que muestre "Success" y las 3 políticas creadas
-- 5. Probar backup manual desde la aplicación en producción (Vercel)
-- 6. El backup automático (GitHub Actions) seguirá funcionando con service_role
-- ============================================================================

-- NOTAS IMPORTANTES:
-- • Los backups automáticos (GitHub Actions) usan service_role que BYPASSA RLS
-- • Los backups manuales (usuarios) ahora pueden INSERT con rol authenticated
-- • Solo ADMINISTRADORES pueden ver/eliminar backups (protección de datos)
-- ============================================================================
