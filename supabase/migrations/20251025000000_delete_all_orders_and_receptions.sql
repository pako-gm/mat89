/*
  # Delete all orders and receptions

  1. Changes
    - Delete all receptions
    - Delete all order lines
    - Delete all change history
    - Delete all orders

  2. Security
    - Only executed by migration, no direct user access
    - Maintains referential integrity by deleting in correct order
*/

DO $$
BEGIN
  -- Delete all receptions first (references pedido_id)
  DELETE FROM tbl_recepciones;

  -- Delete all order lines (references pedido_id)
  DELETE FROM tbl_ln_pedidos_rep;

  -- Delete all change history (references pedido_id)
  DELETE FROM tbl_historico_cambios;

  -- Finally delete all orders
  DELETE FROM tbl_pedidos_rep;

  RAISE NOTICE 'All orders and receptions have been deleted successfully';
END $$;
