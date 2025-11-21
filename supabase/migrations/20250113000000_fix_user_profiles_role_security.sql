-- Migration: Fix user_profiles RLS policies to prevent privilege escalation
-- Date: 2025-01-13
-- Description:
--   - Remove overly permissive "Users can update own profile" policy
--   - Add granular policies that prevent users from modifying their own user_role
--   - Only administrators can modify user_role field
--
-- SECURITY ISSUE FIXED:
--   The previous policy allowed any authenticated user to update ALL fields
--   in their own profile, including user_role, which is a critical security flaw.

BEGIN;

-- 1. Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- 2. Create a restricted policy for users to update ONLY their name
--    This policy explicitly prevents modification of user_role
CREATE POLICY "Users can update own name only"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND user_role = (SELECT user_role FROM user_profiles WHERE user_id = auth.uid())
);

-- 3. Ensure administrators can still update all profiles (including roles)
--    This policy should already exist, but we recreate it to be sure
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  )
);

-- 4. Add comment explaining the security fix
COMMENT ON POLICY "Users can update own name only" ON public.user_profiles IS
'Allows users to update their own profile data (name, etc.) but PREVENTS modification of user_role field to prevent privilege escalation attacks.';

COMMENT ON POLICY "Admins can update all profiles" ON public.user_profiles IS
'Only users with ADMINISTRADOR role can update all user profiles, including changing user roles.';

COMMIT;
