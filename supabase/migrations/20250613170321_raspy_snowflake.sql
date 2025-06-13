/*
  # Eliminar relación entre materiales y proveedores

  1. Cambios
    - Eliminar cualquier constraint de clave foránea entre tbl_materiales y tbl_proveedores
    - Eliminar el campo proveedor_id de tbl_materiales
    - Eliminar índices relacionados con la relación
    - Asegurar que ambas tablas sean completamente independientes

  2. Verificaciones
    - Confirmar que no existen constraints entre las tablas
    - Verificar que no hay índices relacionados
    - Asegurar que las operaciones CRUD funcionan independientemente
*/

-- Paso 1: Eliminar cualquier constraint de clave foránea existente
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Buscar y eliminar todas las constraints de clave foránea que referencien tbl_proveedores desde tbl_materiales
    FOR constraint_record IN
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE confrelid = 'tbl_proveedores'::regclass
        AND conrelid = 'tbl_materiales'::regclass
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', 
                      constraint_record.table_name, 
                      constraint_record.conname);
        RAISE NOTICE 'Eliminado constraint: % de tabla %', constraint_record.conname, constraint_record.table_name;
    END LOOP;
END $$;

-- Paso 2: Eliminar índices relacionados con proveedor_id en tbl_materiales
DO $$
DECLARE
    index_record RECORD;
BEGIN
    -- Buscar índices en tbl_materiales que contengan proveedor_id
    FOR index_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'tbl_materiales'
        AND indexdef LIKE '%proveedor_id%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
        RAISE NOTICE 'Eliminado índice: %', index_record.indexname;
    END LOOP;
END $$;

-- Paso 3: Eliminar el campo proveedor_id de tbl_materiales si existe
ALTER TABLE tbl_materiales DROP COLUMN IF EXISTS proveedor_id;

-- Paso 4: Verificar que no existen relaciones
DO $$
DECLARE
    constraint_count INTEGER;
    foreign_key_count INTEGER;
BEGIN
    -- Contar constraints entre las tablas
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE (confrelid = 'tbl_proveedores'::regclass AND conrelid = 'tbl_materiales'::regclass)
       OR (confrelid = 'tbl_materiales'::regclass AND conrelid = 'tbl_proveedores'::regclass)
       AND contype = 'f';
    
    -- Contar claves foráneas
    SELECT COUNT(*) INTO foreign_key_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ((tc.table_name = 'tbl_materiales' AND ccu.table_name = 'tbl_proveedores')
         OR (tc.table_name = 'tbl_proveedores' AND ccu.table_name = 'tbl_materiales'));
    
    -- Reportar resultados
    IF constraint_count = 0 AND foreign_key_count = 0 THEN
        RAISE NOTICE 'ÉXITO: No existen relaciones entre tbl_materiales y tbl_proveedores';
    ELSE
        RAISE NOTICE 'ADVERTENCIA: Aún existen % constraints y % claves foráneas', constraint_count, foreign_key_count;
    END IF;
END $$;

-- Paso 5: Crear un comentario en las tablas para documentar la independencia
COMMENT ON TABLE tbl_materiales IS 'Tabla de materiales - independiente de proveedores desde migración 20250120120000';
COMMENT ON TABLE tbl_proveedores IS 'Tabla de proveedores - independiente de materiales desde migración 20250120120000';

-- Paso 6: Verificación final - mostrar estructura de ambas tablas
DO $$
BEGIN
    RAISE NOTICE 'Estructura final de tbl_materiales:';
    RAISE NOTICE 'Columnas: %', (
        SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
        FROM information_schema.columns
        WHERE table_name = 'tbl_materiales'
        ORDER BY ordinal_position
    );
    
    RAISE NOTICE 'Estructura final de tbl_proveedores:';
    RAISE NOTICE 'Columnas: %', (
        SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
        FROM information_schema.columns
        WHERE table_name = 'tbl_proveedores'
        ORDER BY ordinal_position
    );
END $$;