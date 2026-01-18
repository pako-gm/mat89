-- ============================================
-- SCRIPT: Update RLS policies for GESTORAPP role
-- DATE: 2026-01-17
-- DESCRIPTION: Updates Row Level Security policies to allow
--              GESTORAPP role to perform admin operations
-- ============================================

-- ============================================
-- STEP 1: Drop existing policies on user_profiles
-- ============================================

DROP POLICY IF EXISTS "Allow admins to update user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow admins to insert user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow admins to delete user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow admins to read all profiles" ON user_profiles;

-- ============================================
-- STEP 2: Create new policies that include GESTORAPP
-- ============================================

-- SELECT: Users can read their own profile
CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
USING (auth.uid()::text = user_id);

-- SELECT: GESTORAPP and ADMINISTRADOR can read all profiles
CREATE POLICY "Admins can read all profiles"
ON user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()::text
    AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
  )
);

-- UPDATE: GESTORAPP and ADMINISTRADOR can update profiles
CREATE POLICY "Admins can update profiles"
ON user_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()::text
    AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()::text
    AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
  )
);

-- INSERT: GESTORAPP and ADMINISTRADOR can insert profiles
CREATE POLICY "Admins can insert profiles"
ON user_profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()::text
    AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
  )
);

-- DELETE: GESTORAPP and ADMINISTRADOR can delete profiles
CREATE POLICY "Admins can delete profiles"
ON user_profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()::text
    AND user_role IN ('GESTORAPP', 'ADMINISTRADOR')
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check policies exist:
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
