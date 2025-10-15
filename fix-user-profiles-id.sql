-- ============================================
-- SCRIPT: Renombrar user_id a id en user_profiles
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Cambia la columna user_id a id para que
--              coincida con lo que espera el código
-- ============================================

-- INSTRUCCIONES:
-- 1. Ve al panel de Supabase: https://mlisnngduwrlqxyjjibp.supabase.co
-- 2. Navega a "SQL Editor"
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script
-- 5. Recarga la aplicación

BEGIN;

-- Verificar la estructura actual
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('id', 'user_id')
ORDER BY column_name;

-- Si existe user_id pero no id, renombrar
DO $$
BEGIN
  -- Verificar si user_id existe y id no existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'id'
  ) THEN
    -- Renombrar user_id a id
    ALTER TABLE user_profiles RENAME COLUMN user_id TO id;
    RAISE NOTICE '✅ Columna user_id renombrada a id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'id'
  ) THEN
    RAISE NOTICE '✓ La columna id ya existe, no es necesario renombrar';
  ELSE
    RAISE EXCEPTION '❌ No se encontró ni user_id ni id en user_profiles';
  END IF;
END $$;

-- Verificar el resultado
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'id';

-- Verificar que las foreign keys y constraints estén bien
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'user_profiles'
AND kcu.column_name = 'id';

COMMIT;

-- ============================================
-- RESULTADOS ESPERADOS
-- ============================================
-- 1. La columna se llama ahora 'id' en lugar de 'user_id'
-- 2. Todas las referencias FK deben seguir funcionando
-- 3. Las políticas RLS deben actualizarse automáticamente
-- ============================================
