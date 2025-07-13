/*
  # Add linea_pedido_id to tbl_recepciones

  1. Changes
    - Add linea_pedido_id column to tbl_recepciones table
    - Create foreign key constraint to tbl_ln_pedidos_rep(id)
    - Add index for performance optimization
    - Allow multiple receptions per order line
    
  2. Data integrity
    - Column is nullable initially to handle existing data
    - Foreign key ensures referential integrity
    - Cascade delete maintains data consistency
    
  3. Performance
    - Add index on linea_pedido_id for efficient queries
*/

-- Add linea_pedido_id column to tbl_recepciones
ALTER TABLE tbl_recepciones 
ADD COLUMN IF NOT EXISTS linea_pedido_id uuid;

-- Create foreign key constraint to tbl_ln_pedidos_rep
ALTER TABLE tbl_recepciones 
ADD CONSTRAINT fk_recepciones_linea_pedido
FOREIGN KEY (linea_pedido_id) 
REFERENCES tbl_ln_pedidos_rep(id) ON DELETE CASCADE;

-- Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_tbl_recepciones_linea_pedido_id 
ON tbl_recepciones(linea_pedido_id);

-- Update existing data if any exists
-- Note: This assumes that existing receipts should be linked to the first order line
-- You may need to adjust this logic based on your specific data requirements
DO $$
BEGIN
  -- Only update if there are existing receipts without linea_pedido_id
  IF EXISTS (
    SELECT 1 FROM tbl_recepciones 
    WHERE linea_pedido_id IS NULL 
    LIMIT 1
  ) THEN
    -- Update existing receipts to link to the first order line of their respective orders
    UPDATE tbl_recepciones 
    SET linea_pedido_id = (
      SELECT tlp.id 
      FROM tbl_ln_pedidos_rep tlp 
      WHERE tlp.pedido_id = tbl_recepciones.pedido_id 
      ORDER BY tlp.created_at 
      LIMIT 1
    )
    WHERE linea_pedido_id IS NULL 
    AND pedido_id IS NOT NULL;
    
    RAISE NOTICE 'Updated existing receipts with linea_pedido_id references';
  END IF;
END $$;

-- Optionally, make linea_pedido_id NOT NULL after updating existing data
-- Uncomment the following lines if you want to enforce this constraint
-- ALTER TABLE tbl_recepciones 
-- ALTER COLUMN linea_pedido_id SET NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN tbl_recepciones.linea_pedido_id IS 
'Reference to specific order line (tbl_ln_pedidos_rep.id). Allows multiple receptions per order line.';

-- Verify the changes
DO $$
DECLARE
  column_exists boolean;
  constraint_exists boolean;
  index_exists boolean;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tbl_recepciones' 
    AND column_name = 'linea_pedido_id'
  ) INTO column_exists;
  
  -- Check if foreign key constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_recepciones_linea_pedido' 
    AND table_name = 'tbl_recepciones'
  ) INTO constraint_exists;
  
  -- Check if index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'tbl_recepciones' 
    AND indexname = 'idx_tbl_recepciones_linea_pedido_id'
  ) INTO index_exists;
  
  -- Report results
  IF column_exists AND constraint_exists AND index_exists THEN
    RAISE NOTICE 'SUCCESS: linea_pedido_id column, foreign key constraint, and index created successfully';
  ELSE
    RAISE NOTICE 'WARNING: Some components may not have been created correctly. Column: %, Constraint: %, Index: %', 
                 column_exists, constraint_exists, index_exists;
  END IF;
END $$;