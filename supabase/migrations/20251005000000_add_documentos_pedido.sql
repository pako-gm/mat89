-- Crear tabla para documentación de pedidos con enlaces de OneDrive
CREATE TABLE IF NOT EXISTS tbl_documentos_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES tbl_pedidos_rep(id) ON DELETE CASCADE,
  nombre_documento text NOT NULL,
  url_onedrive text NOT NULL,
  tipo_archivo text,
  fecha_subida timestamp with time zone NOT NULL DEFAULT now(),
  usuario_email text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Crear índice para mejorar rendimiento de consultas por pedido
CREATE INDEX IF NOT EXISTS idx_documentos_pedido_pedido_id
  ON tbl_documentos_pedido(pedido_id);

-- Crear índice para ordenar por fecha de subida
CREATE INDEX IF NOT EXISTS idx_documentos_pedido_fecha_subida
  ON tbl_documentos_pedido(fecha_subida DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE tbl_documentos_pedido ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios autenticados pueden ver todos los documentos
CREATE POLICY "Los usuarios autenticados pueden ver documentos"
  ON tbl_documentos_pedido
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política: Los usuarios autenticados pueden insertar documentos
CREATE POLICY "Los usuarios autenticados pueden insertar documentos"
  ON tbl_documentos_pedido
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política: Los usuarios pueden eliminar sus propios documentos o los administradores pueden eliminar cualquiera
CREATE POLICY "Los usuarios pueden eliminar sus documentos"
  ON tbl_documentos_pedido
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      usuario_email = auth.email() OR
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND role = 'ADMINISTRADOR'
      )
    )
  );
