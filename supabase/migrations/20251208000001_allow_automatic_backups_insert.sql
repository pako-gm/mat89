-- =============================================
-- Migration: Allow automatic backups insert
-- Date: 2025-12-08
-- Description: Allow GitHub Actions to insert automatic backups without authentication
-- =============================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Administradores pueden crear backups" ON tbl_backups_registro;

-- Create new insert policy that allows:
-- 1. Administrators to insert manual backups (authenticated)
-- 2. GitHub Actions to insert automatic backups (unauthenticated)
CREATE POLICY "Permitir creación de backups"
  ON tbl_backups_registro
  FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated administrator
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.user_role = 'ADMINISTRADOR'
      )
    )
    OR
    -- Allow if it's an automatic backup without authentication
    (
      auth.uid() IS NULL
      AND tipo = 'automatico'
      AND usuario_creador = 'GitHub Actions'
    )
  );

-- Add comment
COMMENT ON POLICY "Permitir creación de backups" ON tbl_backups_registro IS
  'Permite a administradores crear backups manuales y a GitHub Actions crear backups automáticos sin autenticación';

-- =============================================
-- END OF MIGRATION
-- =============================================
