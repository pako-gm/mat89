/*
  # Create tbl_recepciones table

  1. New Tables
    - `tbl_recepciones`
      - `id` (uuid, primary key)
      - `pedido_id` (uuid, references tbl_pedidos_rep)
      - `linea_pedido_id` (uuid, references tbl_ln_pedidos_rep)
      - `fecha_recepcion` (date)
      - `estado_recepcion` (enum: UTIL, IRREPARABLE, SIN ACTUACION, OTROS)
      - `n_rec` (integer, quantity received)
      - `ns_rec` (text, serial number received)
      - `observaciones` (text, observations)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `tbl_recepciones` table
    - Add policy for authenticated users to manage reception data

  3. Indexes
    - Index on pedido_id for faster queries
    - Index on linea_pedido_id for faster queries
*/

-- Create enum type for reception states
DO $$ BEGIN
  CREATE TYPE estado_recepcion_enum AS ENUM ('UTIL', 'IRREPARABLE', 'SIN ACTUACION', 'OTROS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tbl_recepciones table
CREATE TABLE IF NOT EXISTS tbl_recepciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  linea_pedido_id uuid NOT NULL,
  fecha_recepcion date NOT NULL DEFAULT CURRENT_DATE,
  estado_recepcion estado_recepcion_enum NOT NULL DEFAULT 'UTIL',
  n_rec integer NOT NULL DEFAULT 1,
  ns_rec text DEFAULT '',
  observaciones text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  -- Add foreign key to tbl_pedidos_rep if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_pedidos_rep') THEN
    ALTER TABLE tbl_recepciones 
    ADD CONSTRAINT fk_recepciones_pedido 
    FOREIGN KEY (pedido_id) REFERENCES tbl_pedidos_rep(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key to tbl_ln_pedidos_rep if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_ln_pedidos_rep') THEN
    ALTER TABLE tbl_recepciones 
    ADD CONSTRAINT fk_recepciones_linea_pedido 
    FOREIGN KEY (linea_pedido_id) REFERENCES tbl_ln_pedidos_rep(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recepciones_pedido_id ON tbl_recepciones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_linea_pedido_id ON tbl_recepciones(linea_pedido_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_fecha ON tbl_recepciones(fecha_recepcion);

-- Enable Row Level Security
ALTER TABLE tbl_recepciones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read reception data"
  ON tbl_recepciones
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert reception data"
  ON tbl_recepciones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update reception data"
  ON tbl_recepciones
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete reception data"
  ON tbl_recepciones
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  CREATE TRIGGER update_tbl_recepciones_updated_at
    BEFORE UPDATE ON tbl_recepciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;