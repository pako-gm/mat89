-- 20250709202501_update_user_profiles_table.sql
-- Este script actualiza la tabla user_profiles para mejorar la gestión de perfiles de usuario en Supabase.

-- 1. Actualizar el tipo ENUM user_role si es necesario
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'user_role'::regtype 
            AND enumlabel = 'ADMINISTRADOR'
        ) THEN
            DROP TYPE IF EXISTS user_role;
            CREATE TYPE user_role AS ENUM ('ADMINISTRADOR', 'EDICION', 'CONSULTAS');
            
            ALTER TABLE public.user_profiles 
            ALTER COLUMN role TYPE user_role 
            USING role::text::user_role;
        END IF;
    ELSE
        CREATE TYPE user_role AS ENUM ('ADMINISTRADOR', 'EDICION', 'CONSULTAS');
    END IF;
END
$$;

-- 2. Añadir columnas faltantes (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- 3. Configuración básica de la tabla
ALTER TABLE public.user_profiles 
ALTER COLUMN role SET DEFAULT 'CONSULTAS';

-- 4. Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Política de lectura: usuarios ven solo su propio perfil + todos los activos para ADMINISTRADOR
DROP POLICY IF EXISTS user_profiles_read_policy ON public.user_profiles;
CREATE POLICY user_profiles_read_policy
ON public.user_profiles
FOR SELECT
USING (
    -- ADMINISTRADOR puede ver todos los perfiles activos
    (EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.user_id = auth.uid() AND up.role = 'ADMINISTRADOR'
    ) AND is_active = true
) OR (
    -- Usuarios no ADMINISTRADOR solo ven su propio perfil
    user_id = auth.uid()
);

-- 6. Política de escritura: solo ADMINISTRADOR puede editar
DROP POLICY IF EXISTS user_profiles_write_policy ON public.user_profiles;
CREATE POLICY user_profiles_write_policy
ON public.user_profiles
FOR ALL
TO authenticated
USING (
    -- Solo aplica para ADMINISTRADOR
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.user_id = auth.uid() AND up.role = 'ADMINISTRADOR'
    )
)
WITH CHECK (
    -- Verificación adicional para operaciones INSERT/UPDATE
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.user_id = auth.uid() AND up.role = 'ADMINISTRADOR'
    )
);

-- 7. Política especial para service_role (Edge Functions)
DROP POLICY IF EXISTS user_profiles_service_policy ON public.user_profiles;
CREATE POLICY user_profiles_service_policy
ON public.user_profiles
FOR ALL
TO service_role
USING (true);

-- 8. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_timestamp_trigger ON public.user_profiles;
CREATE TRIGGER update_user_profiles_timestamp_trigger
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_profiles_timestamp();

-- 9. Actualizar registros existentes (opcional)
UPDATE public.user_profiles 
SET status = CASE 
    WHEN is_active THEN 'active' 
    ELSE 'disabled' 
END
WHERE status IS NULL;