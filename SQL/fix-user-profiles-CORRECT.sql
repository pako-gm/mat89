-- ============================================
-- SCRIPT: REVERTIR y AGREGAR columnas correctas
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: La tabla necesita AMBAS columnas:
--   - id: PRIMARY KEY (UUID único para cada fila)
--   - user_id: FK a auth.users (para vincular usuario)
-- ============================================

BEGIN;

-- PASO 1: Revertir el cambio anterior (id → user_id)
ALTER TABLE user_profiles RENAME COLUMN id TO user_id;

-- PASO 2: Agregar una nueva columna 'id' como PRIMARY KEY
ALTER TABLE user_profiles ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- PASO 3: Verificar la estructura
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('id', 'user_id')
ORDER BY column_name;

-- PASO 4: Verificar constraints
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles'
AND kcu.column_name IN ('id', 'user_id');

COMMIT;

-- ============================================
-- RESULTADOS ESPERADOS
-- ============================================
-- user_id | uuid | NO  | (FK a auth.users)
-- id      | uuid | NO  | gen_random_uuid() (PK)
-- ============================================
