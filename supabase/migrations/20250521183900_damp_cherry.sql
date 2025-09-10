/*
  # Create role-based access control system

  1. New Tables
    - `user_profiles` - Stores user roles and metadata
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `role` (user_role enum)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
  2. New Types
    - `user_role` enum - Defines available user roles
      - 'ADMINISTRADOR' - Full access
      - 'EDICION' - Can edit but not delete
      - 'CONSULTAS' - Read-only access
      
  3. Security
    - Enable RLS on all tables
    - Create role-checking functions
    - Set up proper policies for all tables
*/

-- Create the user_role enum type if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('ADMINISTRADOR', 'EDICION', 'CONSULTAS');
  END IF;
END $$;

-- Create a table to store user profiles with roles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role public.user_role NOT NULL DEFAULT 'CONSULTAS',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on the profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for the profiles table - safely dropping if they already exist
DO $$
BEGIN
  -- Users can view own profile policy
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'user_profiles') THEN
    DROP POLICY "Users can view own profile" ON public.user_profiles;
  END IF;
  CREATE POLICY "Users can view own profile" 
  ON public.user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

  -- Admins can view all profiles policy
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'user_profiles') THEN
    DROP POLICY "Admins can view all profiles" ON public.user_profiles;
  END IF;
  CREATE POLICY "Admins can view all profiles" 
  ON public.user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'ADMINISTRADOR'
    )
  );

  -- Only admins can insert profiles policy
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can insert profiles' AND tablename = 'user_profiles') THEN
    DROP POLICY "Only admins can insert profiles" ON public.user_profiles;
  END IF;
  CREATE POLICY "Only admins can insert profiles" 
  ON public.user_profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'ADMINISTRADOR'
    )
  );

  -- Only admins can update profiles policy
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can update profiles' AND tablename = 'user_profiles') THEN
    DROP POLICY "Only admins can update profiles" ON public.user_profiles;
  END IF;
  CREATE POLICY "Only admins can update profiles" 
  ON public.user_profiles 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'ADMINISTRADOR'
    )
  );
END $$;

-- Create a trigger to update timestamps
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update timestamp if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_profile_timestamp' 
    AND tgrelid = 'public.user_profiles'::regclass
  ) THEN
    CREATE TRIGGER update_profile_timestamp
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_updated_at();
  END IF;
END $$;

-- Function to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role public.user_role) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE 
      id = auth.uid() AND
      role = required_role
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a user has any of the specified roles
CREATE OR REPLACE FUNCTION public.user_has_any_role(VARIADIC required_roles public.user_role[]) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE 
      id = auth.uid() AND
      role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql;

-- Insert sample user profiles
INSERT INTO public.user_profiles (id, email, role)
VALUES 
  ('a81791eb-737c-4a74-8b19-837b2866d53b', 'fgmarmol@renfe.es', 'ADMINISTRADOR'),
  ('00000000-0000-0000-0000-000000000001', 'angel.aparisi@renfe.es', 'EDICION'),
  ('00000000-0000-0000-0000-000000000002', 'consulta@renfe.es', 'CONSULTAS')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, 
    role = EXCLUDED.role;

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.tbl_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tbl_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tbl_pedidos_rep ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tbl_recepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tbl_historico_cambios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tbl_ln_pedidos_rep ENABLE ROW LEVEL SECURITY;

-- Update policies on material tables
DO $$
BEGIN
  -- All users can view materials
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated users can view materials' AND tablename = 'tbl_materiales') THEN
    DROP POLICY "All authenticated users can view materials" ON public.tbl_materiales;
  END IF;
  CREATE POLICY "All authenticated users can view materials" 
  ON public.tbl_materiales 
  FOR SELECT 
  TO authenticated 
  USING (true);

  -- Policy for inserting materials
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users only' AND tablename = 'tbl_materiales') THEN
    DROP POLICY "Enable insert for authenticated users only" ON public.tbl_materiales;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can insert materials' AND tablename = 'tbl_materiales') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can insert materials" ON public.tbl_materiales;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can insert materials" 
  ON public.tbl_materiales 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

  -- Policy for updating materials
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can update materials' AND tablename = 'tbl_materiales') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can update materials" ON public.tbl_materiales;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can update materials" 
  ON public.tbl_materiales 
  FOR UPDATE 
  TO authenticated 
  USING (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

  -- Policy for deleting materials
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only ADMINISTRADOR role can delete materials' AND tablename = 'tbl_materiales') THEN
    DROP POLICY "Only ADMINISTRADOR role can delete materials" ON public.tbl_materiales;
  END IF;
  CREATE POLICY "Only ADMINISTRADOR role can delete materials" 
  ON public.tbl_materiales 
  FOR DELETE 
  TO authenticated 
  USING (public.user_has_role('ADMINISTRADOR'));
END $$;

-- Add policies for providers table
DO $$
BEGIN
  -- All users can view providers
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated users can view providers' AND tablename = 'tbl_proveedores') THEN
    DROP POLICY "All authenticated users can view providers" ON public.tbl_proveedores;
  END IF;
  CREATE POLICY "All authenticated users can view providers" 
  ON public.tbl_proveedores 
  FOR SELECT 
  TO authenticated 
  USING (true);

  -- Policy for inserting providers
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can modify providers' AND tablename = 'tbl_proveedores') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can modify providers" ON public.tbl_proveedores;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can modify providers" 
  ON public.tbl_proveedores 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

  -- Policy for updating providers
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can update providers' AND tablename = 'tbl_proveedores') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can update providers" ON public.tbl_proveedores;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can update providers" 
  ON public.tbl_proveedores 
  FOR UPDATE 
  TO authenticated 
  USING (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

  -- Policy for deleting providers
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only ADMINISTRADOR role can delete providers' AND tablename = 'tbl_proveedores') THEN
    DROP POLICY "Only ADMINISTRADOR role can delete providers" ON public.tbl_proveedores;
  END IF;
  CREATE POLICY "Only ADMINISTRADOR role can delete providers" 
  ON public.tbl_proveedores 
  FOR DELETE 
  TO authenticated 
  USING (public.user_has_role('ADMINISTRADOR'));
END $$;

-- Handle order tables policies
DO $$
BEGIN
  -- Clean up existing policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for authenticated users' AND tablename = 'tbl_pedidos_rep') THEN
    DROP POLICY "Enable all operations for authenticated users" ON public.tbl_pedidos_rep;
  END IF;

  -- Create view policy for orders
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated users can view orders' AND tablename = 'tbl_pedidos_rep') THEN
    DROP POLICY "All authenticated users can view orders" ON public.tbl_pedidos_rep;
  END IF;
  CREATE POLICY "All authenticated users can view orders" 
  ON public.tbl_pedidos_rep 
  FOR SELECT 
  TO authenticated 
  USING (true);

  -- Create policy for order creation
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can create orders' AND tablename = 'tbl_pedidos_rep') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can create orders" ON public.tbl_pedidos_rep;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can create orders" 
  ON public.tbl_pedidos_rep 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

  -- Create policy for order updates
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can update orders' AND tablename = 'tbl_pedidos_rep') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can update orders" ON public.tbl_pedidos_rep;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can update orders" 
  ON public.tbl_pedidos_rep 
  FOR UPDATE 
  TO authenticated 
  USING (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

  -- Create policy for order deletion
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only ADMINISTRADOR role can delete orders' AND tablename = 'tbl_pedidos_rep') THEN
    DROP POLICY "Only ADMINISTRADOR role can delete orders" ON public.tbl_pedidos_rep;
  END IF;
  CREATE POLICY "Only ADMINISTRADOR role can delete orders" 
  ON public.tbl_pedidos_rep 
  FOR DELETE 
  TO authenticated 
  USING (public.user_has_role('ADMINISTRADOR'));
END $$;

-- Add RLS policies for related tables
DO $$
BEGIN
  -- Policies for receptions table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated users can view receptions' AND tablename = 'tbl_recepciones') THEN
    DROP POLICY "All authenticated users can view receptions" ON public.tbl_recepciones;
  END IF;
  CREATE POLICY "All authenticated users can view receptions" 
  ON public.tbl_recepciones 
  FOR SELECT 
  TO authenticated 
  USING (true);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can modify receptions' AND tablename = 'tbl_recepciones') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can modify receptions" ON public.tbl_recepciones;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can modify receptions" 
  ON public.tbl_recepciones 
  FOR ALL
  TO authenticated 
  USING (public.user_has_any_role('ADMINISTRADOR', 'EDICION'))
  WITH CHECK (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

  -- Policies for change history table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated users can view change history' AND tablename = 'tbl_historico_cambios') THEN
    DROP POLICY "All authenticated users can view change history" ON public.tbl_historico_cambios;
  END IF;
  CREATE POLICY "All authenticated users can view change history" 
  ON public.tbl_historico_cambios 
  FOR SELECT 
  TO authenticated 
  USING (true);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can modify change history' AND tablename = 'tbl_historico_cambios') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can modify change history" ON public.tbl_historico_cambios;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can modify change history" 
  ON public.tbl_historico_cambios 
  FOR INSERT
  TO authenticated 
  WITH CHECK (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));

  -- Policies for order lines table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated users can view order lines' AND tablename = 'tbl_ln_pedidos_rep') THEN
    DROP POLICY "All authenticated users can view order lines" ON public.tbl_ln_pedidos_rep;
  END IF;
  CREATE POLICY "All authenticated users can view order lines" 
  ON public.tbl_ln_pedidos_rep 
  FOR SELECT 
  TO authenticated 
  USING (true);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users with ADMINISTRADOR or EDICION roles can modify order lines' AND tablename = 'tbl_ln_pedidos_rep') THEN
    DROP POLICY "Users with ADMINISTRADOR or EDICION roles can modify order lines" ON public.tbl_ln_pedidos_rep;
  END IF;
  CREATE POLICY "Users with ADMINISTRADOR or EDICION roles can modify order lines" 
  ON public.tbl_ln_pedidos_rep 
  FOR ALL
  TO authenticated 
  USING (public.user_has_any_role('ADMINISTRADOR', 'EDICION'))
  WITH CHECK (public.user_has_any_role('ADMINISTRADOR', 'EDICION'));
END $$;