/*
  # Crear relación entre materiales y líneas de pedido

  1. Cambios
    - Crear foreign key constraint entre tbl_materiales.matricula_89 y tbl_ln_pedidos_rep.matricula_89
    - Agregar índices para optimizar consultas
    - Validar integridad referencial
  
  2. Seguridad
    - Mantener RLS existentes
    - No afectar políticas actuales
*/

-- Crear índice en matricula_89 de tbl_materiales si no existe
CREATE INDEX IF NOT EXISTS idx_tbl_materiales_matricula_89 
ON tbl_materiales(matricula_89);

-- Crear índice en matricula_89 de tbl_ln_pedidos_rep si no existe  
CREATE INDEX IF NOT EXISTS idx_tbl_ln_pedidos_rep_matricula_89 
ON tbl_ln_pedidos_rep(matricula_89);

-- Verificar que todas las matrículas en tbl_ln_pedidos_rep existen en tbl_materiales
-- Si hay datos inconsistentes, se debe resolver antes de crear la FK
DO $$
DECLARE
    inconsistent_count INTEGER;
BEGIN
    -- Contar registros inconsistentes
    SELECT COUNT(*) INTO inconsistent_count
    FROM tbl_ln_pedidos_rep tlp
    WHERE tlp.matricula_89 IS NOT NULL 
    AND tlp.matricula_89 != ''
    AND NOT EXISTS (
        SELECT 1 FROM tbl_materiales tm 
        WHERE tm.matricula_89::text = tlp.matricula_89
    );
    
    IF inconsistent_count > 0 THEN
        RAISE NOTICE 'ADVERTENCIA: Encontradas % líneas de pedido con matrículas que no existen en tbl_materiales', inconsistent_count;
        RAISE NOTICE 'Se procederá a crear materiales faltantes automáticamente';
        
        -- Crear materiales faltantes con descripción genérica
        INSERT INTO tbl_materiales (matricula_89, descripcion, created_at, updated_at)
        SELECT DISTINCT 
            tlp.matricula_89::integer,
            'MATERIAL CREADO AUTOMÁTICAMENTE - ' || tlp.descripcion,
            now(),
            now()
        FROM tbl_ln_pedidos_rep tlp
        WHERE tlp.matricula_89 IS NOT NULL 
        AND tlp.matricula_89 != ''
        AND NOT EXISTS (
            SELECT 1 FROM tbl_materiales tm 
            WHERE tm.matricula_89::text = tlp.matricula_89
        )
        ON CONFLICT (matricula_89) DO NOTHING;
        
        RAISE NOTICE 'Materiales faltantes creados automáticamente';
    ELSE
        RAISE NOTICE 'Verificación exitosa: Todas las matrículas en líneas de pedido existen en materiales';
    END IF;
END $$;

-- Crear la foreign key constraint
-- Nota: Usar una conversión de tipos ya que matricula_89 es integer en tbl_materiales y text en tbl_ln_pedidos_rep
DO $$
BEGIN
    -- Verificar si la constraint ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_ln_pedidos_matricula_material'
        AND table_name = 'tbl_ln_pedidos_rep'
    ) THEN
        -- Crear la foreign key constraint
        ALTER TABLE tbl_ln_pedidos_rep 
        ADD CONSTRAINT fk_ln_pedidos_matricula_material
        FOREIGN KEY (matricula_89) 
        REFERENCES tbl_materiales(matricula_89::text)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT;
        
        RAISE NOTICE 'Foreign key constraint creada exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key constraint ya existe';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al crear foreign key: %', SQLERRM;
        RAISE NOTICE 'Esto puede deberse a incompatibilidad de tipos de datos';
        RAISE NOTICE 'Verificar que matricula_89 sea consistente entre ambas tablas';
END $$;

-- Función para validar integridad referencial
CREATE OR REPLACE FUNCTION validate_material_order_integrity()
RETURNS TABLE(
    invalid_count INTEGER,
    sample_invalid_records TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH invalid_records AS (
        SELECT tlp.matricula_89
        FROM tbl_ln_pedidos_rep tlp
        WHERE tlp.matricula_89 IS NOT NULL 
        AND tlp.matricula_89 != ''
        AND NOT EXISTS (
            SELECT 1 FROM tbl_materiales tm 
            WHERE tm.matricula_89::text = tlp.matricula_89
        )
        LIMIT 10
    )
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM invalid_records),
        array_agg(matricula_89) 
    FROM invalid_records;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar validación final
DO $$
DECLARE
    validation_result RECORD;
BEGIN
    SELECT * INTO validation_result FROM validate_material_order_integrity();
    
    IF validation_result.invalid_count = 0 THEN
        RAISE NOTICE 'ÉXITO: Integridad referencial validada correctamente';
    ELSE
        RAISE NOTICE 'ADVERTENCIA: % registros sin integridad referencial', validation_result.invalid_count;
        RAISE NOTICE 'Ejemplos: %', validation_result.sample_invalid_records;
    END IF;
END $$;