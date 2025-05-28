/*
  # Fix infinite recursion in user_profiles policies
  
  1. Changes
    - Modify RLS policies for user_profiles table to prevent infinite recursion
    - Create secure but non-recursive policy approach
  
  2. Security
    - Maintain same security constraints without recursive policy evaluation
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.user_profiles;

-- Create a security definer function to check if a user is an admin without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_role public.user_role;
BEGIN
  -- Direct query bypassing RLS
  SELECT role INTO user_role 
  FROM public.user_profiles 
  WHERE id = auth.uid();
  
  RETURN user_role = 'ADMINISTRADOR';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new non-recursive policies
-- All users can view their own profile (no recursion)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Admins can view all profiles (using our non-recursive function)
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (public.is_admin_user());

-- Only admins can insert profiles (using our non-recursive function)
CREATE POLICY "Only admins can insert profiles" 
ON public.user_profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin_user());

-- Only admins can update profiles (using our non-recursive function)
CREATE POLICY "Only admins can update profiles" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated 
USING (public.is_admin_user());

-- Update the user_has_role function to use the direct approach
CREATE OR REPLACE FUNCTION public.user_has_role(required_role public.user_role) 
RETURNS BOOLEAN AS $$
DECLARE
  user_role public.user_role;
BEGIN
  -- Direct query bypassing RLS
  SELECT role INTO user_role 
  FROM public.user_profiles 
  WHERE id = auth.uid();
  
  RETURN user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user_has_any_role function to use the direct approach
CREATE OR REPLACE FUNCTION public.user_has_any_role(VARIADIC required_roles public.user_role[]) 
RETURNS BOOLEAN AS $$
DECLARE
  user_role public.user_role;
BEGIN
  -- Direct query bypassing RLS
  SELECT role INTO user_role 
  FROM public.user_profiles 
  WHERE id = auth.uid();
  
  RETURN user_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;