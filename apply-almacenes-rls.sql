-- ============================================
-- SCRIPT: Aplicar políticas RLS a tbl_almacenes
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Habilita RLS y crea políticas para permitir que
--              todos los usuarios autenticados puedan leer almacenes
-- ============================================

-- INSTRUCCIONES:
-- 1. Ve al panel de Supabase: https://mlisnngduwrlqxyjjibp.supabase.co
-- 2. Navega a "SQL Editor"
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script
-- 5. Verifica que no haya errores
-- 6. Recarga la aplicación y prueba el modal "Gestionar Ámbitos"

BEGIN;

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

-- Verificar que las políticas se crearon correctamente
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

COMMIT;

-- Si todo salió bien, deberías ver 2 políticas listadas:
-- 1. "Administradores pueden gestionar almacenes" (ALL)
-- 2. "Usuarios autenticados pueden ver almacenes" (SELECT)