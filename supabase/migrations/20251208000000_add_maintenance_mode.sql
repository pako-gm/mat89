-- ============================================================================
-- MIGRACIÓN: Sistema de Modo Mantenimiento
-- ============================================================================
-- Propósito: Controlar el modo mantenimiento del sistema para poder
--            paralizar la aplicación durante modificaciones importantes
-- Fecha: 2024-12-08
-- ============================================================================

-- ============================================================================
-- TABLA: Estado del Modo Mantenimiento
-- ============================================================================
-- Esta tabla almacena UN ÚNICO registro que controla si el sistema
-- está en modo mantenimiento o no
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tbl_maintenance_mode (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT,
  activated_by TEXT,
  activated_at TIMESTAMP,
  last_updated TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)  -- Solo permite una fila
);

-- Inicializar con modo mantenimiento DESACTIVADO
INSERT INTO public.tbl_maintenance_mode (id, is_active, message, last_updated)
VALUES (1, FALSE, 'El sistema está en modo mantenimiento. Por favor, intenta más tarde.', NOW())
ON CONFLICT (id) DO NOTHING;

-- Índice para optimizar lecturas
CREATE INDEX IF NOT EXISTS idx_maintenance_mode_active
ON public.tbl_maintenance_mode(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.tbl_maintenance_mode ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Anyone can view maintenance mode" ON public.tbl_maintenance_mode;
DROP POLICY IF EXISTS "Only admins can modify maintenance mode" ON public.tbl_maintenance_mode;

-- Cualquiera puede VER el estado del modo mantenimiento
CREATE POLICY "Anyone can view maintenance mode"
ON public.tbl_maintenance_mode
FOR SELECT
USING (true);

-- Solo usuarios autenticados pueden MODIFICAR
CREATE POLICY "Only admins can modify maintenance mode"
ON public.tbl_maintenance_mode
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PERMISOS
-- ============================================================================

-- Dar permisos de lectura a todos
GRANT SELECT ON public.tbl_maintenance_mode TO authenticated, anon;

-- Dar permisos de actualización solo a usuarios autenticados
GRANT UPDATE ON public.tbl_maintenance_mode TO authenticated;

-- ============================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE public.tbl_maintenance_mode IS
'Tabla que controla el estado del modo mantenimiento del sistema. Solo debe tener UNA fila.';

COMMENT ON COLUMN public.tbl_maintenance_mode.id IS
'ID fijo = 1. Solo puede existir una fila gracias al constraint single_row.';

COMMENT ON COLUMN public.tbl_maintenance_mode.is_active IS
'Indica si el modo mantenimiento está activo (TRUE) o inactivo (FALSE).';

COMMENT ON COLUMN public.tbl_maintenance_mode.message IS
'Mensaje personalizado que se mostrará a los usuarios cuando el sistema esté en mantenimiento.';

COMMENT ON COLUMN public.tbl_maintenance_mode.activated_by IS
'Email del usuario administrador que activó el modo mantenimiento.';

COMMENT ON COLUMN public.tbl_maintenance_mode.activated_at IS
'Timestamp de cuando se activó el modo mantenimiento.';

COMMENT ON COLUMN public.tbl_maintenance_mode.last_updated IS
'Timestamp de la última actualización del estado.';

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================