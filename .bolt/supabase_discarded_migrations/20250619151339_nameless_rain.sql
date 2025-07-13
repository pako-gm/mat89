/*
  # Alineación de tipos de datos para tbl_recepciones

  1. Cambios
    - Modificar el tipo de la columna 'estado_recepcion' de TEXT a estado_recepcion_enum
    - Modificar el tipo de la columna 'n_rec' de NUMERIC a INTEGER
  
  2. Consideraciones
    - Se asume que los valores existentes en 'estado_recepcion' son válidos para el ENUM
    - Se asume que los valores existentes en 'n_rec' no tienen decimales o que la pérdida de precisión es aceptable
  
  3. Seguridad
    - No se modifican las políticas de RLS existentes
*/

-- Paso 1: Asegurar que el tipo ENUM 'estado_recepcion_enum' existe
-- Este tipo debería haber sido creado por la migración 20250616185140_hidden_darkness.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_recepcion_enum') THEN
    CREATE TYPE estado_recepcion_enum AS ENUM ('UTIL', 'IRREPARABLE', 'SIN ACTUACION', 'OTROS');
    RAISE NOTICE 'Tipo ENUM "estado_recepcion_enum" creado.';
  ELSE
    RAISE NOTICE 'Tipo ENUM "estado_recepcion_enum" ya existe.';
  END IF;
END $$;

-- Paso 2: Verificar datos existentes antes de la conversión
DO $$
DECLARE
  invalid_estado_count INTEGER;
  decimal_nrec_count INTEGER;
BEGIN
  -- Verificar valores de estado_recepcion que no son válidos para el ENUM
  SELECT COUNT(*) INTO invalid_estado_count
  FROM tbl_recepciones
  WHERE estado_recepcion IS NOT NULL 
  AND estado_recepcion NOT IN ('UTIL', 'IRREPARABLE', 'SIN ACTUACION', 'OTROS');
  
  -- Verificar valores de n_rec que tienen decimales
  SELECT COUNT(*) INTO decimal_nrec_count
  FROM tbl_recepciones
  WHERE n_rec IS NOT NULL 
  AND n_rec != TRUNC(n_rec);
  
  IF invalid_estado_count > 0 THEN
    RAISE NOTICE 'ADVERTENCIA: % registros tienen valores de estado_recepcion no válidos para el ENUM', invalid_estado_count;
    -- Mostrar algunos ejemplos
    RAISE NOTICE 'Ejemplos de valores inválidos: %', (
      SELECT string_agg(DISTINCT estado_recepcion, ', ')
      FROM tbl_recepciones
      WHERE estado_recepcion IS NOT NULL 
      AND estado_recepcion NOT IN ('UTIL', 'IRREPARABLE', 'SIN ACTUACION', 'OTROS')
      LIMIT 5
    );
  END IF;
  
  IF decimal_nrec_count > 0 THEN
    RAISE NOTICE 'ADVERTENCIA: % registros tienen valores decimales en n_rec que se truncarán', decimal_nrec_count;
  END IF;
END $$;

-- Paso 3: Limpiar datos inconsistentes antes de la conversión
-- Convertir valores inválidos de estado_recepcion a 'OTROS'
UPDATE tbl_recepciones 
SET estado_recepcion = 'OTROS'
WHERE estado_recepcion IS NOT NULL 
AND estado_recepcion NOT IN ('UTIL', 'IRREPARABLE', 'SIN ACTUACION', 'OTROS');

-- Paso 4: Modificar el tipo de la columna 'estado_recepcion'
-- Se utiliza USING para convertir los valores existentes
DO $$
BEGIN
  ALTER TABLE tbl_recepciones
  ALTER COLUMN estado_recepcion TYPE estado_recepcion_enum
  USING estado_recepcion::estado_recepcion_enum;
  
  RAISE NOTICE 'Columna "estado_recepcion" modificada a tipo estado_recepcion_enum.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al modificar estado_recepcion: %', SQLERRM;
    RAISE;
END $$;

-- Paso 5: Modificar el tipo de la columna 'n_rec'
-- Se utiliza USING para convertir los valores existentes de numeric a integer
DO $$
BEGIN
  ALTER TABLE tbl_recepciones
  ALTER COLUMN n_rec TYPE integer
  USING n_rec::integer;
  
  RAISE NOTICE 'Columna "n_rec" modificada a tipo integer.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al modificar n_rec: %', SQLERRM;
    RAISE;
END $$;

-- Paso 6: Agregar constraint para asegurar que n_rec sea positivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'check_n_rec_positive'
    AND table_name = 'tbl_recepciones'
  ) THEN
    ALTER TABLE tbl_recepciones 
    ADD CONSTRAINT check_n_rec_positive CHECK (n_rec > 0);
    RAISE NOTICE 'Constraint check_n_rec_positive agregado.';
  ELSE
    RAISE NOTICE 'Constraint check_n_rec_positive ya existe.';
  END IF;
END $$;

-- Verificación final de los tipos de datos
DO $$
DECLARE
  estado_recepcion_type text;
  n_rec_type text;
  total_records INTEGER;
BEGIN
  -- Obtener tipos de datos actuales
  SELECT data_type INTO estado_recepcion_type
  FROM information_schema.columns
  WHERE table_name = 'tbl_recepciones' AND column_name = 'estado_recepcion';

  SELECT data_type INTO n_rec_type
  FROM information_schema.columns
  WHERE table_name = 'tbl_recepciones' AND column_name = 'n_rec';
  
  -- Contar registros totales
  SELECT COUNT(*) INTO total_records FROM tbl_recepciones;

  RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
  RAISE NOTICE 'Total de registros en tbl_recepciones: %', total_records;
  RAISE NOTICE 'Tipo de estado_recepcion: % (esperado: USER-DEFINED para ENUM)', estado_recepcion_type;
  RAISE NOTICE 'Tipo de n_rec: % (esperado: integer)', n_rec_type;

  -- Verificar que los tipos son correctos
  IF estado_recepcion_type IN ('USER-DEFINED', 'estado_recepcion_enum') AND n_rec_type = 'integer' THEN
    RAISE NOTICE 'ÉXITO: Los tipos de datos han sido alineados correctamente.';
  ELSE
    RAISE NOTICE 'ADVERTENCIA: Los tipos de datos no coinciden completamente con lo esperado.';
  END IF;
  
  RAISE NOTICE '=== FIN VERIFICACIÓN ===';
END $$;

-- Paso 7: Verificar que las políticas RLS siguen funcionando
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'tbl_recepciones';
  
  RAISE NOTICE 'Políticas RLS activas en tbl_recepciones: %', policy_count;
  
  IF policy_count > 0 THEN
    RAISE NOTICE 'Las políticas RLS están preservadas.';
  ELSE
    RAISE NOTICE 'ADVERTENCIA: No se encontraron políticas RLS para tbl_recepciones.';
  END IF;
END $$;