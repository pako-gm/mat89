/*
  # Mejoras para tabla de materiales

  1. Nuevos Campos
    - info_adicional (text) - Campo editable para información adicional del material
    - updated_by (text) - Email del usuario que realizó la última actualización

  2. Cambios
    - Agregar campos necesarios para seguimiento de modificaciones por usuario
    - Mantener compatibilidad con datos existentes

  3. Seguridad
    - Mantener RLS existente
    - No afectar políticas actuales
*/

-- Agregar nuevos campos a la tabla de materiales
ALTER TABLE tbl_materiales 
ADD COLUMN IF NOT EXISTS info_adicional text,
ADD COLUMN IF NOT EXISTS updated_by text;

-- Crear índice para mejorar consultas por usuario que actualizó
CREATE INDEX IF NOT EXISTS idx_tbl_materiales_updated_by 
ON tbl_materiales(updated_by);

-- Función para actualizar automáticamente el campo updated_by
CREATE OR REPLACE FUNCTION update_material_updated_by()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
BEGIN
  -- Obtener el email del usuario actual
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Establecer el usuario que actualizó
  NEW.updated_by = COALESCE(user_email, 'SISTEMA');
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para actualizar automáticamente updated_by en INSERT y UPDATE
DROP TRIGGER IF EXISTS trigger_update_material_updated_by ON tbl_materiales;
CREATE TRIGGER trigger_update_material_updated_by
  BEFORE INSERT OR UPDATE ON tbl_materiales
  FOR EACH ROW
  EXECUTE FUNCTION update_material_updated_by();

-- Inicializar campos para registros existentes
UPDATE tbl_materiales 
SET 
  info_adicional = COALESCE(info_adicional, ''),
  updated_by = COALESCE(updated_by, 'SISTEMA')
WHERE info_adicional IS NULL OR updated_by IS NULL;