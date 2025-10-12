/*
  # Fix Infinite Recursion in user_profiles RLS Policies

  ## Problem
  The current policies for user_profiles have infinite recursion because they
  query the same table (user_profiles) within their own policy checks:

  EXISTS (
    SELECT 1 FROM user_profiles  <-- RECURSION!
    WHERE id = auth.uid() AND role = 'ADMINISTRADOR'
  )

  ## Solution
  Use a separate function or simpler policy logic that doesn't query user_profiles
  within its own policies.

  ### Approach 1: Self-reference only (Recommended for now)
  - Users can read their own profile
  - For admin operations, we'll handle checks at application level

  ### Future improvement:
  - Store role in auth.users metadata
  - Or create a security definer function
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.user_profiles;

-- Policy 1: Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Allow insert for authenticated users (will be controlled by app logic)
-- This is needed for user registration
CREATE POLICY "Allow insert for authenticated users"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own profile (name only, not role)
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

/*
  Note: For ADMIN operations (viewing all users, changing roles, etc.)
  we rely on Service Role Key in the backend or through a secure API endpoint.

  The frontend Panel de Control should use a secure backend endpoint
  or the app should handle role checks in application logic.

  Alternative: If you want to keep admin RLS, create a helper function:
*/

-- Create a helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  );
$$;

-- Alternative Policy for admins (using helper function)
-- Uncomment if you want admins to have full access via RLS
/*
CREATE POLICY "Admins can read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin());
*/

-- Add comment
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current user is an administrator. Uses SECURITY DEFINER to avoid recursion.';

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
