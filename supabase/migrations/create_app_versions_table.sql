-- Crear tabla de versiones de la aplicación
CREATE TABLE IF NOT EXISTS public.tbl_app_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_number VARCHAR(20) NOT NULL UNIQUE,
  version_name VARCHAR(100) NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE NOT NULL,
  changes TEXT[] NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Añadir comentarios a la tabla
COMMENT ON TABLE public.tbl_app_versions IS 'Historial de versiones de la aplicación';
COMMENT ON COLUMN public.tbl_app_versions.version_number IS 'Número de versión (ej: 1.0.0)';
COMMENT ON COLUMN public.tbl_app_versions.version_name IS 'Nombre descriptivo de la versión';
COMMENT ON COLUMN public.tbl_app_versions.release_date IS 'Fecha de lanzamiento de la versión';
COMMENT ON COLUMN public.tbl_app_versions.changes IS 'Array de cambios principales en esta versión';

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_app_versions_release_date ON public.tbl_app_versions(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_app_versions_version_number ON public.tbl_app_versions(version_number);

-- Configurar RLS (Row Level Security)
ALTER TABLE public.tbl_app_versions ENABLE ROW LEVEL SECURITY;

-- Política: todos pueden leer versiones
CREATE POLICY "Todos pueden ver versiones"
  ON public.tbl_app_versions
  FOR SELECT
  USING (true);

-- Política: solo administradores pueden insertar/actualizar/eliminar
CREATE POLICY "Solo administradores pueden modificar versiones"
  ON public.tbl_app_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true
    )
  );

-- Insertar versiones históricas basadas en commits
INSERT INTO public.tbl_app_versions (version_number, version_name, release_date, changes) VALUES
('1.0.0', 'Versión Inicial', '2024-01-15', ARRAY[
  'Primera versión funcional del sistema',
  'Módulo de gestión de pedidos',
  'Sistema de recepciones',
  'Gestión de materiales y proveedores'
]),
('1.1.0', 'Mejoras de Excel', '2024-02-20', ARRAY[
  'Implementación de generación de Excel para proveedores internos',
  'Mejoras en plantillas de Excel',
  'Corrección de placeholders en documentos'
]),
('1.2.0', 'Optimización de Interfaz', '2024-03-10', ARRAY[
  'Refactorización de OrderList con CSS externo',
  'Mejoras en visualización de líneas de pedido',
  'Actualización de logo en documentos generados',
  'Mejoras en cierre de formularios'
]),
('1.3.0', 'Mejoras de Usabilidad', '2024-04-05', ARRAY[
  'Foco automático en campo matrícula',
  'Movida carpeta CSS a public',
  'Refactorización código duplicado es_externo',
  'Instalación librería xlsx-populate',
  'Añadido video tutorial en OneDrive'
]),
('1.4.0', 'Gestión de Usuarios', '2024-05-15', ARRAY[
  'Panel de control para administradores',
  'Sistema de roles: ADMINISTRADOR, EDICION, CONSULTAS',
  'Gestión de perfiles de usuario',
  'Asignación de ámbito de almacenes',
  'Políticas RLS para seguridad'
]),
('1.5.0', 'Documentación y Backups', '2024-06-01', ARRAY[
  'Sistema de backups mejorado',
  'Documentación completa de componentes',
  'Scripts para verificación RLS',
  'Instrucciones rápidas para corrección de errores',
  'Actualización formato copyright'
]),
('1.6.0', 'Mejoras de Búsqueda', '2024-07-10', ARRAY[
  'Búsqueda incremental en autocompletado de materiales',
  'Mejora funcionalidad búsqueda en ConsultaPage',
  'Añadido estado "sin recepción" en búsquedas',
  'Tooltip para registro en OrderForm',
  'Callback onSelectionComplete en MaterialAutocompleteInput'
]),
('1.7.0', 'Optimización y Validaciones', '2024-08-20', ARRAY[
  'Paginación ajustada a 10 registros por página',
  'Validación de fecha de recepción',
  'Verificación de pedidos antes de eliminar proveedores',
  'Mejoras en validación de matrícula en MaterialForm',
  'Optimización de consultas en PanelDeControl'
]),
('1.8.0', 'Despliegue Vercel', '2024-09-05', ARRAY[
  'Corrección errores escalado a Vercel',
  'Añadido módulo analytics de Vercel',
  'Configuración vercel.json para reset de contraseña',
  'Corrección error 404 en producción'
]),
('1.9.0', 'Reset de Contraseña', '2024-10-01', ARRAY[
  'Traducción mensajes de error Supabase a español',
  'Mejoras en ResetPasswordPage',
  'Control de estado de usuarios',
  'Verificación de usuarios activos/inactivos',
  'Mejoras en flujo de recuperación de contraseña'
]),
('2.0.0', 'Actualización Mayor', '2024-11-06', ARRAY[
  'Paginación mejorada a 10 registros por página',
  'Añadido vehículo 464 a lista de vehículos',
  'Todos los mensajes de error traducidos al español',
  'Sistema completo de gestión de garantías y reparaciones',
  'Optimizaciones generales de rendimiento'
]);
