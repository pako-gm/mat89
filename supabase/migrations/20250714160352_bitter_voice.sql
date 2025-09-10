/*
  # Add estado_pedido column to tbl_pedidos_rep table

  1. Changes to Tables
     - Add `estado_pedido` column to `tbl_pedidos_rep` table
       - Type: TEXT with default value 'PENDIENTE'
       - Used to track order completion status (PENDIENTE/COMPLETADO)

  2. Notes
     - This column will automatically set new orders to 'PENDIENTE' status
     - Existing orders will also default to 'PENDIENTE' status
     - The column supports the order completion workflow
*/

-- Add the estado_pedido column to tbl_pedidos_rep table
ALTER TABLE tbl_pedidos_rep 
ADD COLUMN IF NOT EXISTS estado_pedido TEXT DEFAULT 'PENDIENTE';

-- Update existing records to have the default value
UPDATE tbl_pedidos_rep 
SET estado_pedido = 'PENDIENTE' 
WHERE estado_pedido IS NULL;