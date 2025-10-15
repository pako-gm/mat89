-- ============================================
-- SCRIPT: CORREGIR estructura de user_profiles (CON LIMPIEZA)
-- FECHA: 2025-10-14
-- DESCRIPCIÓN: Limpia registros huérfanos y corrige estructura
-- ============================================

BEGIN;

-- PASO 1: Ver la estructura actual
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('id', 'user_id')
ORDER BY column_name;

-- PASO 2: Eliminar el constraint PRIMARY KEY existente
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;

-- PASO 3: Renombrar 'id' a 'user_id'
ALTER TABLE user_profiles RENAME COLUMN id TO user_id;

-- PASO 4: Agregar nueva columna 'id' con valores únicos
ALTER TABLE user_profiles ADD COLUMN id UUID DEFAULT gen_random_uuid() NOT NULL;

-- PASO 5: Crear el PRIMARY KEY en la nueva columna 'id'
ALTER TABLE user_profiles ADD PRIMARY KEY (id);

-- PASO 6: LIMPIAR registros huérfanos antes de crear FK
-- Ver cuántos registros huérfanos hay
SELECT
  'Registros huérfanos encontrados:' as mensaje,
  COUNT(*) as cantidad
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = up.user_id
);

-- ELIMINAR registros huérfanos
DELETE FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = up.user_id
);

-- PASO 7: Ahora sí, crear el constraint de FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_user_id_fkey'
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

    RAISE NOTICE '✅ Foreign key constraint creado';
  ELSE
    RAISE NOTICE '✓ Foreign key constraint ya existe';
  END IF;
END $$;

-- PASO 8: Verificar la estructura final
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('id', 'user_id')
ORDER BY column_name;

-- PASO 9: Verificar constraints
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles'
AND kcu.column_name IN ('id', 'user_id')
ORDER BY kcu.column_name;

-- PASO 10: Verificar datos finales
SELECT
  id,
  user_id,
  email,
  user_role
FROM user_profiles
ORDER BY created_at DESC;

COMMIT;

-- ============================================
-- RESULTADOS ESPERADOS
-- ============================================
-- 1. Registros huérfanos eliminados
-- 2. Columnas:
--    - id      | uuid | NO  | gen_random_uuid() (PK)
--    - user_id | uuid | NO  | (FK a auth.users)
-- 3. Constraints:
--    - user_profiles_pkey (PRIMARY KEY en 'id')
--    - user_profiles_user_id_fkey (FOREIGN KEY en 'user_id')
-- 4. Todos los registros tienen user_id válido
-- ============================================
