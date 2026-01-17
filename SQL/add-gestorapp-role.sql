-- ============================================
-- SCRIPT: Add GESTORAPP role
-- DATE: 2026-01-17
-- DESCRIPTION: Adds GESTORAPP as the highest privilege role
--              and ensures only ONE user can have this role
-- ============================================

-- ============================================
-- STEP 0: Add GESTORAPP to the user_role ENUM
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction
-- Run this command FIRST, separately
-- ============================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'GESTORAPP' BEFORE 'ADMINISTRADOR';

-- ============================================
-- Now run the rest in a transaction
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Create trigger function to enforce single GESTORAPP
-- ============================================

CREATE OR REPLACE FUNCTION check_single_gestorapp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if the new role is GESTORAPP
  IF NEW.user_role = 'GESTORAPP' THEN
    -- Check if another user already has GESTORAPP role
    IF EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_role = 'GESTORAPP'
      AND user_id != NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Solo puede existir un usuario con rol GESTORAPP';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 2: Create trigger on user_profiles table
-- ============================================

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS enforce_single_gestorapp ON user_profiles;

-- Create trigger for INSERT and UPDATE operations
CREATE TRIGGER enforce_single_gestorapp
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_single_gestorapp();

-- ============================================
-- STEP 3: Elevate existing user to GESTORAPP
-- ============================================

UPDATE user_profiles
SET user_role = 'GESTORAPP'
WHERE email = 'fgmarmol@renfe.es';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (run manually)
-- ============================================

-- Verify the user was elevated:
-- SELECT email, user_role FROM user_profiles WHERE email = 'fgmarmol@renfe.es';

-- Verify only one GESTORAPP exists:
-- SELECT * FROM user_profiles WHERE user_role = 'GESTORAPP';

-- Test the constraint (should fail):
-- UPDATE user_profiles SET user_role = 'GESTORAPP' WHERE email = 'other@example.com';
