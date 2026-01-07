-- ================================================================
-- MIGRACIÓN: Sistema de Maestro de Plantillas
-- Fecha: 2026-01-04
-- Incluye: Plantillas, Materiales de Plantillas, Tipos de Revisión, Historial
-- ================================================================
-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar
-- ================================================================

-- ============================================================
-- TABLA 1: tbl_tipos_revision
-- ============================================================

CREATE TABLE IF NOT EXISTS tbl_tipos_revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  es_predeterminado BOOLEAN NOT NULL DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT codigo_formato CHECK (codigo ~ '^[A-Z0-9]+$'),
  CONSTRAINT codigo_no_vacio CHECK (char_length(trim(codigo)) > 0)
);

COMMENT ON TABLE tbl_tipos_revision IS 'Tipos de revisión para materiales de plantillas';
COMMENT ON COLUMN tbl_tipos_revision.codigo IS 'Código único alfanumérico (ej: IM1, R2)';
COMMENT ON COLUMN tbl_tipos_revision.descripcion IS 'Descripción del tipo de revisión';
COMMENT ON COLUMN tbl_tipos_revision.es_predeterminado IS 'TRUE para tipos fijos (IM1-IM6, R1-R4), FALSE para personalizados';

-- Insertar tipos por defecto (FIJOS)
INSERT INTO tbl_tipos_revision (codigo, descripcion, es_predeterminado) VALUES
('IM1', 'Inspección Mensual 1', TRUE),
('IM2', 'Inspección Mensual 2', TRUE),
('IM3', 'Inspección Mensual 3', TRUE),
('IM4', 'Inspección Mensual 4', TRUE),
('IM5', 'Inspección Mensual 5', TRUE),
('IM6', 'Inspección Mensual 6', TRUE),
('R1', 'Revisión 1', TRUE),
('R2', 'Revisión 2', TRUE),
('R3', 'Revisión 3', TRUE),
('R4', 'Revisión 4', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- TABLA 2: tbl_plantillas
-- ============================================================

CREATE TABLE IF NOT EXISTS tbl_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  serie_vehiculo TEXT NOT NULL,
  usuario_creador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT nombre_no_vacio CHECK (char_length(trim(nombre)) > 0)
);

COMMENT ON TABLE tbl_plantillas IS 'Plantillas de materiales para reparaciones';
COMMENT ON COLUMN tbl_plantillas.nombre IS 'Nombre de la plantilla (sugerido: Intervencion [nombre] - Serie [numero])';
COMMENT ON COLUMN tbl_plantillas.serie_vehiculo IS 'Serie de vehículo (todos los materiales deben ser de esta serie)';
COMMENT ON COLUMN tbl_plantillas.usuario_creador_id IS 'Usuario que creó la plantilla (único que puede eliminarla)';
COMMENT ON COLUMN tbl_plantillas.updated_by IS 'Último usuario que modificó la plantilla';

-- ============================================================
-- TABLA 3: tbl_plantillas_materiales
-- ============================================================

CREATE TABLE IF NOT EXISTS tbl_plantillas_materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id UUID NOT NULL REFERENCES tbl_plantillas(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES tbl_materiales(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 1,
  tipo_revision_id UUID NOT NULL REFERENCES tbl_tipos_revision(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cantidad_positiva CHECK (cantidad > 0),
  CONSTRAINT plantilla_material_unico UNIQUE (plantilla_id, material_id)
);

COMMENT ON TABLE tbl_plantillas_materiales IS 'Materiales asociados a cada plantilla';
COMMENT ON COLUMN tbl_plantillas_materiales.cantidad IS 'Cantidad del material en la plantilla';
COMMENT ON COLUMN tbl_plantillas_materiales.tipo_revision_id IS 'Tipo de revisión asignado al material';
COMMENT ON CONSTRAINT plantilla_material_unico ON tbl_plantillas_materiales IS 'Un material no puede estar duplicado en la misma plantilla';

-- ============================================================
-- TABLA 4: tbl_plantillas_historial
-- ============================================================

CREATE TABLE IF NOT EXISTS tbl_plantillas_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id UUID NOT NULL REFERENCES tbl_plantillas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  accion TEXT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tbl_plantillas_historial IS 'Historial de cambios en plantillas';
COMMENT ON COLUMN tbl_plantillas_historial.accion IS 'Descripción de la acción realizada (ej: "Material añadido: XXX")';

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Índices para tbl_plantillas
CREATE INDEX IF NOT EXISTS idx_plantillas_usuario_creador ON tbl_plantillas(usuario_creador_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_serie ON tbl_plantillas(serie_vehiculo);
CREATE INDEX IF NOT EXISTS idx_plantillas_fecha ON tbl_plantillas(fecha_creacion DESC);

-- Índices para tbl_plantillas_materiales
CREATE INDEX IF NOT EXISTS idx_plantillas_materiales_plantilla ON tbl_plantillas_materiales(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_materiales_material ON tbl_plantillas_materiales(material_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_materiales_tipo ON tbl_plantillas_materiales(tipo_revision_id);

-- Índices para tbl_plantillas_historial
CREATE INDEX IF NOT EXISTS idx_plantillas_historial_plantilla ON tbl_plantillas_historial(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_historial_usuario ON tbl_plantillas_historial(usuario_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_historial_fecha ON tbl_plantillas_historial(fecha DESC);

-- Índices para tbl_tipos_revision
CREATE INDEX IF NOT EXISTS idx_tipos_revision_activo ON tbl_tipos_revision(activo) WHERE activo = TRUE;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE tbl_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_plantillas_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_plantillas_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_tipos_revision ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS: tbl_plantillas
-- ============================================================

-- SELECT: Todos los ADMINISTRADOR ven todas las plantillas
CREATE POLICY plantillas_select_admin ON tbl_plantillas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- INSERT: Todos los ADMINISTRADOR pueden crear plantillas propias
CREATE POLICY plantillas_insert_admin ON tbl_plantillas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
    AND usuario_creador_id = auth.uid()
  );

-- UPDATE: Todos los ADMINISTRADOR pueden modificar cualquier plantilla
CREATE POLICY plantillas_update_admin ON tbl_plantillas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- DELETE: Solo el creador puede eliminar su plantilla
CREATE POLICY plantillas_delete_own ON tbl_plantillas FOR DELETE
  USING (
    usuario_creador_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- ============================================================
-- POLÍTICAS RLS: tbl_plantillas_materiales
-- ============================================================

-- SELECT: Todos los ADMINISTRADOR ven todos los materiales de plantillas
CREATE POLICY plantillas_materiales_select ON tbl_plantillas_materiales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- INSERT: Todos los ADMINISTRADOR pueden añadir materiales
CREATE POLICY plantillas_materiales_insert ON tbl_plantillas_materiales FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- UPDATE: Todos los ADMINISTRADOR pueden actualizar materiales
CREATE POLICY plantillas_materiales_update ON tbl_plantillas_materiales FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- DELETE: Todos los ADMINISTRADOR pueden eliminar materiales
CREATE POLICY plantillas_materiales_delete ON tbl_plantillas_materiales FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- ============================================================
-- POLÍTICAS RLS: tbl_plantillas_historial
-- ============================================================

-- SELECT: Todos los ADMINISTRADOR ven todo el historial
CREATE POLICY plantillas_historial_select ON tbl_plantillas_historial FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- INSERT: Registros de historial solo del usuario actual
CREATE POLICY plantillas_historial_insert ON tbl_plantillas_historial FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
    AND usuario_id = auth.uid()
  );

-- ============================================================
-- POLÍTICAS RLS: tbl_tipos_revision
-- ============================================================

-- SELECT: Todos los ADMINISTRADOR ven todos los tipos
CREATE POLICY tipos_revision_select ON tbl_tipos_revision FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- INSERT: Todos los ADMINISTRADOR pueden crear tipos personalizados
CREATE POLICY tipos_revision_insert ON tbl_tipos_revision FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
  );

-- UPDATE: Todos los ADMINISTRADOR pueden editar tipos NO predeterminados
CREATE POLICY tipos_revision_update ON tbl_tipos_revision FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
    AND es_predeterminado = FALSE
  );

-- DELETE: Todos los ADMINISTRADOR pueden eliminar tipos NO predeterminados
CREATE POLICY tipos_revision_delete ON tbl_tipos_revision FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND user_role = 'ADMINISTRADOR'
    )
    AND es_predeterminado = FALSE
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_plantilla_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tbl_plantillas
CREATE TRIGGER trigger_update_plantilla_timestamp
  BEFORE UPDATE ON tbl_plantillas
  FOR EACH ROW
  EXECUTE FUNCTION update_plantilla_updated_at();

-- Trigger para tbl_tipos_revision
CREATE TRIGGER trigger_update_tipo_revision_timestamp
  BEFORE UPDATE ON tbl_tipos_revision
  FOR EACH ROW
  EXECUTE FUNCTION update_plantilla_updated_at();

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Verificar que las tablas se crearon correctamente
DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  policy_count INTEGER;
  tipo_count INTEGER;
BEGIN
  -- Contar tablas
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name IN ('tbl_plantillas', 'tbl_plantillas_materiales', 'tbl_plantillas_historial', 'tbl_tipos_revision');

  -- Contar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename IN ('tbl_plantillas', 'tbl_plantillas_materiales', 'tbl_plantillas_historial', 'tbl_tipos_revision');

  -- Contar políticas RLS
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('tbl_plantillas', 'tbl_plantillas_materiales', 'tbl_plantillas_historial', 'tbl_tipos_revision');

  -- Contar tipos de revisión por defecto
  SELECT COUNT(*) INTO tipo_count
  FROM tbl_tipos_revision
  WHERE es_predeterminado = TRUE;

  -- Mostrar resultados
  RAISE NOTICE '✅ Tablas creadas: % (esperadas: 4)', table_count;
  RAISE NOTICE '✅ Índices creados: % (esperados: 10)', index_count;
  RAISE NOTICE '✅ Políticas RLS creadas: % (esperadas: 14)', policy_count;
  RAISE NOTICE '✅ Tipos de revisión por defecto: % (esperados: 10)', tipo_count;

  IF table_count = 4 AND index_count = 10 AND policy_count = 14 AND tipo_count = 10 THEN
    RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE';
  ELSE
    RAISE WARNING '⚠️  Verificar resultados - algunos elementos pueden no haberse creado correctamente';
  END IF;
END $$;

-- ============================================================
-- CONSULTAS DE VERIFICACIÓN ADICIONALES
-- ============================================================

-- Ver estructura de las tablas
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('tbl_plantillas', 'tbl_plantillas_materiales', 'tbl_plantillas_historial', 'tbl_tipos_revision')
ORDER BY table_name, ordinal_position;

-- Ver índices creados
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('tbl_plantillas', 'tbl_plantillas_materiales', 'tbl_plantillas_historial', 'tbl_tipos_revision')
ORDER BY tablename, indexname;

-- Ver políticas RLS
SELECT
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('tbl_plantillas', 'tbl_plantillas_materiales', 'tbl_plantillas_historial', 'tbl_tipos_revision')
ORDER BY tablename, policyname;

-- Ver tipos de revisión insertados
SELECT
  codigo,
  descripcion,
  es_predeterminado,
  activo
FROM tbl_tipos_revision
ORDER BY codigo;

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================

SELECT '✅ Migración SQL completada. Verificar los resultados arriba.' AS status;
