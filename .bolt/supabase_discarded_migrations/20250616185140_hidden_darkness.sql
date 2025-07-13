/*
  # Funcionalidad de Recepción de Materiales

  1. Nueva Tabla
    - tbl_recepciones
      - id (uuid, primary key)
      - pedido_id (uuid, foreign key)
      - linea_pedido_id (uuid, foreign key)
      - fecha_recepcion (date)
      - estado_recepcion (enum)
      - n_rec (integer - cantidad recibida)
      - ns_rec (text - número de serie)
      - observaciones (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Enum para Estados
    - estado_recepcion_enum (UTIL, IRREPARABLE, SIN ACTUACION, OTROS)

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create enum for reception states
CREATE TYPE estado_recepcion_enum AS ENUM ('UTIL', 'IRREPARABLE', 'SIN ACTUACION', 'OTROS');

-- Create tbl_recepciones table
CREATE TABLE IF NOT EXISTS tbl_recepciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid REFERENCES tbl_pedidos_rep(id) ON DELETE CASCADE,
  linea_pedido_id uuid REFERENCES tbl_ln_pedidos_rep(id) ON DELETE CASCADE,
  fecha_recepcion date NOT NULL DEFAULT CURRENT_DATE,
  estado_recepcion estado_recepcion_enum NOT NULL,
  n_rec integer NOT NULL CHECK (n_rec > 0),
  ns_rec text,
  observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_recepciones_pedido_id ON tbl_recepciones(pedido_id);
CREATE INDEX idx_recepciones_linea_pedido_id ON tbl_recepciones(linea_pedido_id);
CREATE INDEX idx_recepciones_fecha ON tbl_recepciones(fecha_recepcion);

-- Enable RLS
ALTER TABLE tbl_recepciones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "All authenticated users can view receptions"
ON tbl_recepciones
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can modify receptions"
ON tbl_recepciones
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can update receptions"
ON tbl_recepciones
FOR UPDATE
TO authenticated
USING (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

CREATE POLICY "Only ADMINISTRADOR role can delete receptions"
ON tbl_recepciones
FOR DELETE
TO authenticated
USING (public.user_has_role('ADMINISTRADOR'));

-- Create trigger for updated_at
CREATE TRIGGER update_recepciones_updated_at
  BEFORE UPDATE ON tbl_recepciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add estado_completado column to tbl_ln_pedidos_rep if it doesn't exist
ALTER TABLE tbl_ln_pedidos_rep 
ADD COLUMN IF NOT EXISTS estado_completado boolean DEFAULT false;

-- Add estado_pedido column to tbl_pedidos_rep if it doesn't exist  
ALTER TABLE tbl_pedidos_rep 
ADD COLUMN IF NOT EXISTS estado_pedido text DEFAULT 'PENDIENTE';

-- Function to update line completion status
CREATE OR REPLACE FUNCTION update_line_completion_status()
RETURNS TRIGGER AS $$
DECLARE
    total_enviado integer;
    total_recibido integer;
    line_record RECORD;
BEGIN
    -- Get the line record for either INSERT or DELETE
    IF TG_OP = 'DELETE' THEN
        line_record := OLD;
    ELSE
        line_record := NEW;
    END IF;
    
    -- Get total sent for this line
    SELECT nenv INTO total_enviado
    FROM tbl_ln_pedidos_rep
    WHERE id = line_record.linea_pedido_id;
    
    -- Get total received for this line
    SELECT COALESCE(SUM(n_rec), 0) INTO total_recibido
    FROM tbl_recepciones
    WHERE linea_pedido_id = line_record.linea_pedido_id;
    
    -- Update line completion status
    UPDATE tbl_ln_pedidos_rep
    SET estado_completado = (total_recibido >= total_enviado)
    WHERE id = line_record.linea_pedido_id;
    
    -- Check if all lines of the order are completed
    PERFORM update_order_completion_status(line_record.pedido_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update order completion status
CREATE OR REPLACE FUNCTION update_order_completion_status(order_id uuid)
RETURNS void AS $$
DECLARE
    uncompleted_lines integer;
BEGIN
    -- Count uncompleted lines for this order
    SELECT COUNT(*) INTO uncompleted_lines
    FROM tbl_ln_pedidos_rep
    WHERE pedido_id = order_id AND estado_completado = false;
    
    -- Update order status
    UPDATE tbl_pedidos_rep
    SET estado_pedido = CASE 
        WHEN uncompleted_lines = 0 THEN 'COMPLETADO'
        ELSE 'PENDIENTE'
    END
    WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic status updates
CREATE TRIGGER trigger_update_line_completion
    AFTER INSERT OR UPDATE OR DELETE ON tbl_recepciones
    FOR EACH ROW
    EXECUTE FUNCTION update_line_completion_status();

-- Update existing orders to have proper status
UPDATE tbl_pedidos_rep SET estado_pedido = 'PENDIENTE' WHERE estado_pedido IS NULL;
UPDATE tbl_ln_pedidos_rep SET estado_completado = false WHERE estado_completado IS NULL;