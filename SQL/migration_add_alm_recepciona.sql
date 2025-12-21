-- ================================================================
-- MIGRACIÓN: Añadir campo alm_recepciona a tbl_recepciones
-- ================================================================
-- Fecha: 2025-12-15
-- Rama: INTEGRACION-GARANTIAS-ALMACENES
--
-- Este script añade el campo alm_recepciona a la tabla tbl_recepciones
-- para registrar qué almacén recepciona el material.
--
-- IMPORTANTE: Hacer backup antes de ejecutar
-- ================================================================

-- ============================================================
-- PASO 1: VERIFICAR ESTRUCTURA ACTUAL
-- ============================================================

-- Ver estructura actual de tbl_recepciones
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tbl_recepciones'
ORDER BY ordinal_position;

-- Ver algunas recepciones existentes
SELECT
  r.id,
  r.pedido_id,
  p.alm_envia,
  r.fecha_recepcion,
  r.garantia_aceptada_proveedor
FROM tbl_recepciones r
LEFT JOIN tbl_pedidos_rep p ON r.pedido_id = p.id
LIMIT 10;

-- ============================================================
-- PASO 2: AÑADIR CAMPO alm_recepciona
-- ============================================================

-- Añadir campo alm_recepciona (NOT NULL con default temporal)
ALTER TABLE tbl_recepciones
ADD COLUMN IF NOT EXISTS alm_recepciona VARCHAR(10) NOT NULL DEFAULT '';

-- Verificar que se añadió correctamente
SELECT
  COUNT(*) as total_recepciones,
  COUNT(CASE WHEN alm_recepciona = '' THEN 1 END) as sin_alm_recepciona,
  COUNT(CASE WHEN alm_recepciona != '' THEN 1 END) as con_alm_recepciona
FROM tbl_recepciones;

-- ============================================================
-- PASO 3: POBLAR CON DATOS EXISTENTES
-- ============================================================

-- Actualizar recepciones existentes con el almacén que envió el pedido
UPDATE tbl_recepciones r
SET alm_recepciona = p.alm_envia
FROM tbl_pedidos_rep p
WHERE r.pedido_id = p.id
  AND (r.alm_recepciona IS NULL OR r.alm_recepciona = '');

-- Verificar actualización
SELECT
  'Después de poblar alm_recepciona:' as paso,
  COUNT(*) as total_recepciones,
  COUNT(CASE WHEN alm_recepciona IS NULL OR alm_recepciona = '' THEN 1 END) as vacios,
  COUNT(CASE WHEN alm_recepciona != '' THEN 1 END) as poblados
FROM tbl_recepciones;

-- ============================================================
-- PASO 4: VERIFICACIÓN FINAL
-- ============================================================

-- Ver muestra de recepciones actualizadas
SELECT
  r.id,
  p.num_pedido,
  p.alm_envia as almacen_envio,
  r.alm_recepciona as almacen_recepcion,
  r.fecha_recepcion,
  CASE
    WHEN p.alm_envia = r.alm_recepciona THEN 'COINCIDE'
    ELSE 'NO COINCIDE'
  END as validacion
FROM tbl_recepciones r
LEFT JOIN tbl_pedidos_rep p ON r.pedido_id = p.id
ORDER BY r.fecha_recepcion DESC
LIMIT 20;

-- Verificar que no haya registros vacíos
SELECT COUNT(*) as recepciones_sin_almacen
FROM tbl_recepciones
WHERE alm_recepciona IS NULL OR alm_recepciona = '';

-- Debería retornar 0

-- Verificar distribución por almacén
SELECT
  alm_recepciona,
  COUNT(*) as total_recepciones
FROM tbl_recepciones
WHERE alm_recepciona != ''
GROUP BY alm_recepciona
ORDER BY total_recepciones DESC;

-- ============================================================
-- PASO 5: VALIDACIÓN DE INTEGRIDAD
-- ============================================================

-- Verificar que todos los códigos sean válidos (solo números)
SELECT
  alm_recepciona,
  COUNT(*) as cantidad
FROM tbl_recepciones
WHERE alm_recepciona !~ '^[0-9]+$'  -- No son solo números
  AND alm_recepciona != ''
GROUP BY alm_recepciona;

-- Si esta query retorna resultados, revisar manualmente

-- Verificar recepciones huérfanas (sin pedido asociado)
SELECT
  r.id,
  r.pedido_id,
  r.alm_recepciona,
  r.fecha_recepcion
FROM tbl_recepciones r
LEFT JOIN tbl_pedidos_rep p ON r.pedido_id = p.id
WHERE p.id IS NULL;

-- ============================================================
-- PASO 6: ESTADÍSTICAS FINALES
-- ============================================================

SELECT
  '✅ Migración completada' as status,
  COUNT(*) as total_recepciones,
  COUNT(CASE WHEN alm_recepciona != '' THEN 1 END) as con_almacen,
  COUNT(CASE WHEN alm_recepciona = '' THEN 1 END) as sin_almacen,
  ROUND(
    COUNT(CASE WHEN alm_recepciona != '' THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as porcentaje_completado
FROM tbl_recepciones;

-- ============================================================
-- ROLLBACK (en caso de error)
-- ============================================================

-- Si necesitas revertir la migración:
-- ALTER TABLE tbl_recepciones DROP COLUMN IF EXISTS alm_recepciona;

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
