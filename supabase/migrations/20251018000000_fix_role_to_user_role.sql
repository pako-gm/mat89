/*
  # Fix: Update RLS Policies to use 'user_role' instead of 'role'

  ## Problem
  Old migrations created RLS policies that reference the column 'role' which
  was later renamed to 'user_role'. This causes errors when querying the database.

  ## Solution
  Drop and recreate the affected RLS policies and functions to use 'user_role'
  instead of 'role'.
*/

-- Drop the old policies on user_profiles that reference 'role'
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.user_profiles;

-- Recreate helper functions to use 'user_role' instead of 'role'
CREATE OR REPLACE FUNCTION public.user_has_role(required_role public.user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE
      user_id = auth.uid() AND
      user_role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_has_any_role(VARIADIC required_roles public.user_role[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE
      user_id = auth.uid() AND
      user_role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_has_role(public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_any_role(VARIADIC public.user_role[]) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.user_has_role(public.user_role) IS 'Check if current user has a specific role';
COMMENT ON FUNCTION public.user_has_any_role(VARIADIC public.user_role[]) IS 'Check if current user has any of the specified roles';