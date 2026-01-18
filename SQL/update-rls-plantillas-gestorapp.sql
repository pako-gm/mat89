-- ============================================================
-- MIGRACIÓN: Actualizar RLS de Maestro de Plantillas para GESTORAPP
-- ============================================================
-- Fecha: 2026-01-18
-- Descripción: Actualiza todas las políticas RLS de las tablas de plantillas
--              para incluir el rol GESTORAPP junto a ADMINISTRADOR
-- Problema: Las RLS policies originales solo permitían acceso a ADMINISTRADOR
--           y el rol GESTORAPP se implementó posteriormente
-- ============================================================

-- ============================================================
-- PASO 1: Eliminar políticas existentes de tbl_plantillas
-- ============================================================
DROP POLICY IF EXISTS plantillas_select_admin ON tbl_plantillas;
DROP POLICY IF EXISTS plantillas_insert_admin ON tbl_plantillas;
DROP POLICY IF EXISTS plantillas_update_admin ON tbl_plantillas;
DROP POLICY IF EXISTS plantillas_delete_own ON tbl_plantillas;

-- ============================================================
-- PASO 2: Eliminar políticas existentes de tbl_plantillas_materiales
-- ============================================================
DROP POLICY IF EXISTS plantillas_materiales_select ON tbl_plantillas_materiales;
DROP POLICY IF EXISTS plantillas_materiales_insert ON tbl_plantillas_materiales;
DROP POLICY IF EXISTS plantillas_materiales_update ON tbl_plantillas_materiales;
DROP POLICY IF EXISTS plantillas_materiales_delete ON tbl_plantillas_materiales;

-- ============================================================
-- PASO 3: Eliminar políticas existentes de tbl_plantillas_historial
-- ============================================================
DROP POLICY IF EXISTS plantillas_historial_select ON tbl_plantillas_historial;
DROP POLICY IF EXISTS plantillas_historial_insert ON tbl_plantillas_historial;

-- ============================================================
-- PASO 4: Eliminar políticas existentes de tbl_tipos_revision
-- ============================================================
DROP POLICY IF EXISTS tipos_revision_select ON tbl_tipos_revision;
DROP POLICY IF EXISTS tipos_revision_insert ON tbl_tipos_revision;
DROP POLICY IF EXISTS tipos_revision_update ON tbl_tipos_revision;
DROP POLICY IF EXISTS tipos_revision_delete ON tbl_tipos_revision;

-- ============================================================
-- PASO 5: Recrear políticas RLS para tbl_plantillas
-- ============================================================

-- SELECT: GESTORAPP y ADMINISTRADOR ven todas las plantillas
CREATE POLICY plantillas_select_admin ON tbl_plantillas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- INSERT: GESTORAPP y ADMINISTRADOR pueden crear plantillas propias
CREATE POLICY plantillas_insert_admin ON tbl_plantillas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
    AND usuario_creador_id = auth.uid()
  );

-- UPDATE: GESTORAPP y ADMINISTRADOR pueden modificar cualquier plantilla
CREATE POLICY plantillas_update_admin ON tbl_plantillas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- DELETE: Solo el creador puede eliminar su plantilla (GESTORAPP o ADMINISTRADOR)
CREATE POLICY plantillas_delete_own ON tbl_plantillas FOR DELETE
  USING (
    usuario_creador_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- ============================================================
-- PASO 6: Recrear políticas RLS para tbl_plantillas_materiales
-- ============================================================

-- SELECT: GESTORAPP y ADMINISTRADOR ven todos los materiales de plantillas
CREATE POLICY plantillas_materiales_select ON tbl_plantillas_materiales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- INSERT: GESTORAPP y ADMINISTRADOR pueden añadir materiales
CREATE POLICY plantillas_materiales_insert ON tbl_plantillas_materiales FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- UPDATE: GESTORAPP y ADMINISTRADOR pueden actualizar materiales
CREATE POLICY plantillas_materiales_update ON tbl_plantillas_materiales FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- DELETE: GESTORAPP y ADMINISTRADOR pueden eliminar materiales
CREATE POLICY plantillas_materiales_delete ON tbl_plantillas_materiales FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- ============================================================
-- PASO 7: Recrear políticas RLS para tbl_plantillas_historial
-- ============================================================

-- SELECT: GESTORAPP y ADMINISTRADOR ven todo el historial
CREATE POLICY plantillas_historial_select ON tbl_plantillas_historial FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- INSERT: Registros de historial solo del usuario actual (GESTORAPP o ADMINISTRADOR)
CREATE POLICY plantillas_historial_insert ON tbl_plantillas_historial FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
    AND usuario_id = auth.uid()
  );

-- ============================================================
-- PASO 8: Recrear políticas RLS para tbl_tipos_revision
-- ============================================================

-- SELECT: GESTORAPP y ADMINISTRADOR ven todos los tipos
CREATE POLICY tipos_revision_select ON tbl_tipos_revision FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- INSERT: GESTORAPP y ADMINISTRADOR pueden crear tipos personalizados
CREATE POLICY tipos_revision_insert ON tbl_tipos_revision FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
  );

-- UPDATE: GESTORAPP y ADMINISTRADOR pueden editar tipos NO predeterminados
CREATE POLICY tipos_revision_update ON tbl_tipos_revision FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
    AND es_predeterminado = FALSE
  );

-- DELETE: GESTORAPP y ADMINISTRADOR pueden eliminar tipos NO predeterminados
CREATE POLICY tipos_revision_delete ON tbl_tipos_revision FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
    )
    AND es_predeterminado = FALSE
  );

-- ============================================================
-- PASO 9: Actualizar políticas RLS para tbl_backups_registro
-- NOTA: Esta tabla es de acceso EXCLUSIVO para GESTORAPP
-- ============================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Administradores pueden ver backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Administradores pueden crear backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Administradores pueden eliminar backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "Administradores pueden actualizar backups" ON tbl_backups_registro;

-- SELECT: Solo GESTORAPP puede ver backups
CREATE POLICY "GESTORAPP puede ver backups"
  ON tbl_backups_registro
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'GESTORAPP'
    )
  );

-- INSERT: Solo GESTORAPP puede crear backups
CREATE POLICY "GESTORAPP puede crear backups"
  ON tbl_backups_registro
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'GESTORAPP'
    )
  );

-- DELETE: Solo GESTORAPP puede eliminar backups
CREATE POLICY "GESTORAPP puede eliminar backups"
  ON tbl_backups_registro
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'GESTORAPP'
    )
  );

-- UPDATE: Solo GESTORAPP puede actualizar backups
CREATE POLICY "GESTORAPP puede actualizar backups"
  ON tbl_backups_registro
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_role = 'GESTORAPP'
    )
  );

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Consulta para verificar las políticas actualizadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('tbl_plantillas', 'tbl_plantillas_materiales', 'tbl_plantillas_historial', 'tbl_tipos_revision', 'tbl_backups_registro')
ORDER BY tablename, policyname;
