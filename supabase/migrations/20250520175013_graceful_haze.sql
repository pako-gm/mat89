/*
  # Add fields to suppliers table

  1. New Fields
    - Add address field to store supplier's street address
    - Add city field to store supplier's city
    - Add postal_code field to store supplier's postal code
    - Add province field to store supplier's province/state
    - Add phone field to store supplier's main phone number
    - Add email field to store supplier's contact email
    - Add contact_person field to store name of main contact
    - Add is_external field to indicate if supplier is external
    - Add notes field for additional information

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to the suppliers table
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS ciudad text;
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS codigo_postal text;
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS provincia text;
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS persona_contacto text;
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS es_externo boolean DEFAULT false;
ALTER TABLE tbl_proveedores ADD COLUMN IF NOT EXISTS notas text;