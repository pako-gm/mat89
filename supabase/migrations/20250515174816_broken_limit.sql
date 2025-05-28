/*
  # Delete order 141/25/1002

  1. Changes
    - Delete order with number '141/25/1002'
    - Delete associated order lines
    - Delete associated change history
    - Delete associated receptions
  
  2. Security
    - Only executed by migration, no direct user access
*/

DO $$ 
BEGIN
  -- Delete associated records first to maintain referential integrity
  DELETE FROM tbl_recepciones 
  WHERE pedido_id IN (
    SELECT id FROM tbl_pedidos_rep WHERE num_pedido = '141/25/1002'
  );

  DELETE FROM tbl_ln_pedidos_rep 
  WHERE pedido_id IN (
    SELECT id FROM tbl_pedidos_rep WHERE num_pedido = '141/25/1002'
  );

  DELETE FROM tbl_historico_cambios 
  WHERE pedido_id IN (
    SELECT id FROM tbl_pedidos_rep WHERE num_pedido = '141/25/1002'
  );

  -- Finally delete the order itself
  DELETE FROM tbl_pedidos_rep 
  WHERE num_pedido = '141/25/1002';
END $$;