/*
  # Initial schema setup for Material Repair Management System

  1. New Tables
    - orders
      - id (uuid, primary key)
      - order_number (text, unique)
      - warehouse (text)
      - supplier (text)
      - vehicle (text)
      - warranty (boolean)
      - non_conformity_report (text)
      - dismantle_date (date)
      - shipment_date (date)
      - declared_damage (text)
      - shipment_documentation (text[])
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - order_lines
      - id (uuid, primary key)
      - order_id (uuid, foreign key)
      - registration (text)
      - part_description (text)
      - quantity (integer)
      - serial_number (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - change_history
      - id (uuid, primary key)
      - order_id (uuid, foreign key)
      - user_id (uuid, foreign key)
      - description (text)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  warehouse text NOT NULL,
  supplier text NOT NULL,
  vehicle text NOT NULL,
  warranty boolean DEFAULT false,
  non_conformity_report text,
  dismantle_date date NOT NULL,
  shipment_date date NOT NULL,
  declared_damage text,
  shipment_documentation text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_lines table
CREATE TABLE IF NOT EXISTS order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  registration text NOT NULL,
  part_description text,
  quantity integer DEFAULT 1,
  serial_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create change_history table
CREATE TABLE IF NOT EXISTS change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations for authenticated users" ON orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON order_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON change_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_order_lines_updated_at
  BEFORE UPDATE ON order_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();