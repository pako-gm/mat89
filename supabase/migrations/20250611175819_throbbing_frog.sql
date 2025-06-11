/*
  # Rename matriculas field to matricula_89

  1. Changes
    - Rename column 'matriculas' to 'matricula_89' in tbl_ln_pedidos_rep table
    - Update any indexes that reference the old column name
    - Maintain data integrity during the rename
  
  2. Security
    - No changes to RLS policies needed as they don't reference this column
*/

-- Rename the column from matriculas to matricula_89
ALTER TABLE tbl_ln_pedidos_rep 
RENAME COLUMN matriculas TO matricula_89;

-- Add a comment to document the change
COMMENT ON COLUMN tbl_ln_pedidos_rep.matricula_89 IS 'Matrícula 89 del material/componente';