/*
  # Add delete functionality for orders

  1. Changes
    - Add RLS policy for deleting orders
    - Only admin and edit roles can delete orders
    - Cascade delete for related records
  
  2. Security
    - Enable RLS
    - Add policy for delete operations
*/

-- Add delete policy for orders
CREATE POLICY "Only admin and edit roles can delete orders"
ON tbl_pedidos_rep
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('ADMINISTRADOR', 'EDICION')
  )
);