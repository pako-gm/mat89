/*
  # Remove codigo field from tbl_proveedores

  1. Changes
    - Remove the 'codigo' column from tbl_proveedores table
  
  2. Notes
    - This is a non-destructive change as we're just removing a field
    - No data migration needed as this field will no longer be used
*/

-- Remove the codigo column from the suppliers table
ALTER TABLE tbl_proveedores DROP COLUMN IF EXISTS codigo;