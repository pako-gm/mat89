/*
  # Fix Infinite Recursion in user_profiles RLS Policies (Version 2)

  ## Problem
  The current policies for user_profiles have infinite recursion because they
  query the same table (user_profiles) within their own policy checks.

  ## Solution
  1. Drop ALL existing policies dynamically
  2. Create new policies without recursion
  3. Use a helper function with SECURITY DEFINER
*/

-- Step 1: Drop ALL existing policies on user_profiles dynamically
DO $$
DECLARE
  pol record;
BEGIN
  -- Loop through all policies for user_profiles and drop them
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Step 2: Create helper function to check if user is admin (SECURITY DEFINER avoids recursion)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current user is an administrator. Uses SECURITY DEFINER to avoid recursion.';

-- Step 3: Create new policies without recursion

-- Policy 1: Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Admins can read all profiles (using helper function)
CREATE POLICY "Admins can read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Policy 3: Allow insert for authenticated users (for registration)
CREATE POLICY "Allow insert for authenticated users"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 4: Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy 5: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Policy 6: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Policy 7: Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Verify RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed successfully. No more infinite recursion!';
END $$;
