/*
  # Crear tabla tbl_vehiculos para gestión dinámica de series de vehículos

  1. Propósito
    - Permitir gestión CRUD de series de vehículos desde la interfaz
    - Eliminar hardcodeo de vehículos en MaterialForm.tsx
    - Mantener catálogo centralizado y auditable

  2. Cambios
    - Crear tabla tbl_vehiculos con RLS habilitado
    - Políticas de lectura para todos los usuarios autenticados
    - Políticas de escritura solo para ADMINISTRADORES
    - Poblar con 11 vehículos actuales

  3. Seguridad
    - RLS habilitado
    - Solo administradores activos pueden modificar
*/

-- Crear tabla tbl_vehiculos
CREATE TABLE IF NOT EXISTS tbl_vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_vehiculo VARCHAR(10) NOT NULL UNIQUE,
  nombre_vehiculo VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE tbl_vehiculos ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer vehículos
CREATE POLICY "Usuarios autenticados pueden ver vehículos"
  ON tbl_vehiculos
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo administradores activos pueden gestionar vehículos
CREATE POLICY "Administradores pueden gestionar vehículos"
  ON tbl_vehiculos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true
    )
  );

-- Poblar con vehículos actuales
INSERT INTO tbl_vehiculos (codigo_vehiculo, nombre_vehiculo) VALUES
  ('252', 'Serie 252'),
  ('310', 'Serie 310'),
  ('319', 'Serie 319'),
  ('333', 'Serie 333'),
  ('447', 'Serie 447'),
  ('449', 'Serie 449'),
  ('464', 'Serie 464'),
  ('470', 'Serie 470'),
  ('490', 'Serie 490'),
  ('592', 'Serie 592'),
  ('999', 'Serie 999');

-- Índice para búsquedas rápidas por código
CREATE INDEX idx_tbl_vehiculos_codigo ON tbl_vehiculos(codigo_vehiculo);

-- Comentarios para documentación
COMMENT ON TABLE tbl_vehiculos IS 'Catálogo de series de vehículos del sistema';
COMMENT ON COLUMN tbl_vehiculos.codigo_vehiculo IS 'Código/número de la serie de vehículo (ej: 252, 310)';
COMMENT ON COLUMN tbl_vehiculos.nombre_vehiculo IS 'Nombre descriptivo de la serie (editable)';
