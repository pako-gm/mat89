-- Add cancelado column to tbl_pedidos_rep
ALTER TABLE tbl_pedidos_rep
ADD COLUMN cancelado BOOLEAN DEFAULT FALSE;

-- Add comment to the column
COMMENT ON COLUMN tbl_pedidos_rep.cancelado IS 'Indica si el pedido ha sido cancelado (deshabilitado) en lugar de eliminado';