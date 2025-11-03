-- ============================================
-- SCRIPT: Cambiar tipo de ambito_almacenes a ARRAY
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Cambia el tipo de TEXT a TEXT[] para que
--              PostgreSQL devuelva un array de UUIDs
-- ============================================

BEGIN;

-- Ver el tipo actual
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'ambito_almacenes';

-- Si es TEXT, cambiar a TEXT[]
DO $$
BEGIN
  -- Primero eliminar datos existentes para evitar errores de conversión
  UPDATE user_profiles SET ambito_almacenes = NULL;

  -- Eliminar la columna y recrearla con el tipo correcto
  ALTER TABLE user_profiles DROP COLUMN IF EXISTS ambito_almacenes;

  -- Crear la columna con el tipo correcto (array de texto)
  ALTER TABLE user_profiles ADD COLUMN ambito_almacenes TEXT[] DEFAULT '{}';

  RAISE NOTICE '✅ Columna ambito_almacenes recreada como TEXT[]';
END $$;

-- Agregar comentario
COMMENT ON COLUMN user_profiles.ambito_almacenes IS
  'Array de UUIDs de almacenes (tbl_almacenes.id) a los que el usuario tiene acceso visual';

-- Verificar el resultado
SELECT
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'ambito_almacenes';

COMMIT;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- column_name: ambito_almacenes
-- data_type: ARRAY
-- udt_name: _text
-- column_default: '{}'::text[]
-- ============================================
