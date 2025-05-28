/*
  # Update order permissions

  1. Changes
    - Drop existing restrictive policies
    - Add new policies allowing all authenticated users to perform CRUD operations
    - Enable RLS for orders table
  
  2. Security
    - All authenticated users can now perform any operation on orders
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Only admin and edit roles can delete orders" ON tbl_pedidos_rep;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tbl_pedidos_rep;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON tbl_pedidos_rep;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON tbl_pedidos_rep;
DROP POLICY IF EXISTS "Only admin and edit roles can delete orders" ON tbl_pedidos_rep;

-- Create new unified policy for all operations
CREATE POLICY "Enable all operations for authenticated users"
ON tbl_pedidos_rep
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);