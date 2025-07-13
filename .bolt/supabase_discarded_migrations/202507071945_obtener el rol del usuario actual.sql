-- LANZAR ESTA CONSULTA CUANDO YA TENGA CREDITOS BOLT.
-- 1. Función para obtener el rol del usuario actual
-- Esta función auxiliar nos permite obtener el rol del usuario que ejecuta la función.
-- Necesitará una política RLS que permita a los usuarios leer su propio perfil.
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
    user_id uuid := auth.uid();
    user_role user_role;
BEGIN
    SELECT role INTO user_role
    FROM user_profiles
    WHERE id = user_id;

    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER permite que la función ignore RLS si fuera necesario,
                                    -- pero para leer su propio perfil, SECURITY INVOKER podría ser suficiente
                                    -- si RLS está bien configurado para lectura de propio perfil.
                                    -- Para simplicidad en este caso, usamos SECURITY DEFINER para asegurar que pueda leer el rol.


-- 2. Función get_all_users()
-- Devuelve todos los usuarios, solo para Administradores.
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id uuid,
    email text,
    role user_role,
    created_at timestamptz,
    updated_at timestamptz,
    nombre_usuario text,
    is_active boolean
) AS $$
DECLARE
    current_user_role user_role;
BEGIN
    SELECT get_current_user_role() INTO current_user_role;

    IF current_user_role IS NULL OR current_user_role <> 'ADMINISTRADOR' THEN
        RAISE EXCEPTION 'Acceso denegado. Se requiere un rol de Administrador.';
    END IF;

    RETURN QUERY
    SELECT
        up.id,
        up.email,
        up.role,
        up.created_at,
        up.updated_at,
        up.nombre_usuario,
        up.is_active
    FROM
        user_profiles up
    ORDER BY
        up.nombre_usuario ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Función update_user_role(p_user_id UUID, p_new_role TEXT)
-- Actualiza el rol de un usuario, solo para Administradores.
CREATE OR REPLACE FUNCTION update_user_role(
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS VOID AS $$
DECLARE
    current_user_role user_role;
BEGIN
    SELECT get_current_user_role() INTO current_user_role;

    IF current_user_role IS NULL OR current_user_role <> 'ADMINISTRADOR' THEN
        RAISE EXCEPTION 'Acceso denegado. Se requiere un rol de Administrador para actualizar los roles.';
    END IF;

    -- Validar que p_new_role sea uno de los roles permitidos por el ENUM 'user_role'
    IF p_new_role NOT IN ('ADMINISTRADOR', 'EDICION', 'CONSULTAS') THEN
        RAISE EXCEPTION 'Rol "%" no válido. Los roles permitidos son: Administrador, Edicion, Consultas.', p_new_role;
    END IF;

    UPDATE user_profiles
    SET role = p_new_role::user_role -- Castea el texto al tipo ENUM
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario con ID % no encontrado.', p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Función update_user_status(p_user_id UUID, p_new_status TEXT)
-- Cambia el estado (activo/inactivo) de un usuario, solo para Administradores.
-- Dado que is_active es BOOLEAN, p_new_status deberá ser 'true' o 'false' como texto.
-- Si en el frontend manejas "Activo"/"Inactivo", deberás mapearlo a TRUE/FALSE antes de llamar a esta función,
-- o modificar esta función para aceptar TEXT 'Activo'/'Inactivo' y convertirlo a BOOLEAN aquí.
-- Para apegarme al tipo BOOLEAN de `is_active`, la función esperará 'true' o 'false' como string.
CREATE OR REPLACE FUNCTION update_user_status(
    p_user_id UUID,
    p_new_status TEXT -- Espera 'true' o 'false' como string
)
RETURNS VOID AS $$
DECLARE
    current_user_role user_role;
    status_boolean BOOLEAN;
BEGIN
    SELECT get_current_user_role() INTO current_user_role;

    IF current_user_role IS NULL OR current_user_role <> 'ADMINISTRADOR' THEN
        RAISE EXCEPTION 'Acceso denegado. Se requiere un rol de Administrador para cambiar el estado del usuario.';
    END IF;

    -- Convertir el texto 'true'/'false' a BOOLEAN
    CASE p_new_status
        WHEN 'true' THEN status_boolean := TRUE;
        WHEN 'false' THEN status_boolean := FALSE;
        ELSE RAISE EXCEPTION 'Estado "%" no válido. Se espera "true" o "false".', p_new_status;
    END CASE;

    UPDATE user_profiles
    SET is_active = status_boolean
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario con ID % no encontrado.', p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Otorga permisos de ejecución a los roles necesarios
-- Esto es crucial para que tu aplicación pueda llamar a estas funciones.
-- `anon` para desarrollo/pruebas si no hay autenticación requerida para el login,
-- pero para estas funciones de admin, `authenticated` es lo mínimo.
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_status(UUID, TEXT) TO authenticated;

-- NOTA sobre SECURITY DEFINER:
-- Al usar SECURITY DEFINER, la función se ejecuta con los privilegios del usuario que la creó (generalmente el rol 'supabase_admin' o similar).
-- Esto permite que la función ignore las políticas RLS y acceda a los datos necesarios para verificar el rol o realizar la actualización.
-- Asegúrate de que tu lógica de IF para el rol sea robusta, ya que el control de acceso está ahora dentro de la función.
-- Parece ser que tu aplicación maneja la autenticación y autorización correctamente,
-- por lo que estas funciones deberían funcionar bien siempre que el usuario autenticado tenga el rol adecuado