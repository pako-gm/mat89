/*
  # Add UPDATE policy for tbl_historico_cambios

  1. Changes
    - Add UPDATE policy for `tbl_historico_cambios` table to allow users with ADMINISTRADOR or EDICION roles to update records
    
  2. Security
    - Maintains existing security model by allowing only ADMINISTRADOR and EDICION roles to update change history records
    - Required for upsert operations that the application uses
*/

-- Add UPDATE policy for change history table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can update change history' AND tablename = 'tbl_historico_cambios') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can update change history" ON public.tbl_historico_cambios;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can update change history" 
  ON public.tbl_historico_cambios 
  FOR UPDATE
  TO authenticated 
  USING (public.user_has_any_role('ADMINISTRADOR', 'EDICION'))
  WITH CHECK (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));
END $$;