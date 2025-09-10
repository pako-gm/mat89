-- LANZAR ESTA CONSULTA CUANDO YA TENGA CREDITOS BOLT.

-- ¡IMPORTANTE! Antes de ejecutar cualquier script ALTER,
-- asegúrate de tener una COPIA DE SEGURIDAD de tu base de datos.

-- Paso 1: Configurar 'updated_at' para que se actualice automáticamente en cada modificación de fila.
-- Primero, necesitamos la función PL/pgSQL que actualiza la marca de tiempo.
-- La creamos o reemplazamos para asegurar que esté actualizada.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Luego, creamos o reemplazamos el trigger que llama a la función antes de cada UPDATE.
-- Esto asegura que 'updated_at' se actualice automáticamente cuando cualquier fila de user_profiles sea modificada.
DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Paso 2: Asegurar la vinculación de 'id' con 'auth.users.id' como Foreign Key.
-- Asumimos que 'id' ya es PRIMARY KEY.
-- Añadimos la Foreign Key si no existe ya, con ON DELETE CASCADE.
ALTER TABLE user_profiles
ADD CONSTRAINT fk_user_id
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- No se realizan cambios en 'email', 'role', 'nombre_usuario', ni 'is_active'
-- según tus últimas instrucciones, ya que cumplen con los requisitos o se manejarán en el frontend.