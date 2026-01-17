-- ================================================================
-- MIGRACIÓN: Desactivar almacén ALM140 - VALENCIA (CERRADO)
-- ================================================================
-- Fecha: 2026-01-17
-- Rama: main
--
-- Este script desactiva el almacén ALM140 (ALMACEN T. LOC. VALENCIA)
-- para que NO aparezca en los dropdowns de nuevos pedidos.
-- El almacén permanece en la base de datos para mantener el histórico.
--
-- IMPORTANTE: El código ya filtra por activo=true, solo falta actualizar el registro
-- ================================================================

-- ============================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL DEL ALMACÉN
-- ============================================================

-- Ver el almacén ALM140 antes de desactivar
SELECT
  id,
  codigo_alm,
  nombre_alm,
  activo,
  created_at
FROM tbl_almacenes
WHERE codigo_alm = '140';

-- Ver cuántos pedidos históricos tiene este almacén
SELECT
  COUNT(*) as total_pedidos_historicos
FROM tbl_pedidos_rep
WHERE alm_envia = '140';

-- ============================================================
-- PASO 2: DESACTIVAR ALMACÉN ALM140
-- ============================================================

-- Marcar almacén como inactivo
UPDATE tbl_almacenes
SET activo = FALSE
WHERE codigo_alm = '140';

-- ============================================================
-- PASO 3: VERIFICACIÓN FINAL
-- ============================================================

-- Confirmar que el almacén está desactivado
SELECT
  id,
  codigo_alm,
  nombre_alm,
  activo,
  created_at
FROM tbl_almacenes
WHERE codigo_alm = '140';

-- Ver todos los almacenes activos (ALM140 NO debe aparecer)
SELECT
  codigo_alm,
  nombre_alm,
  activo
FROM tbl_almacenes
WHERE activo = TRUE
ORDER BY codigo_alm;

-- Ver todos los almacenes inactivos (ALM140 debe aparecer aquí)
SELECT
  codigo_alm,
  nombre_alm,
  activo
FROM tbl_almacenes
WHERE activo = FALSE
ORDER BY codigo_alm;

-- ============================================================
-- PASO 4: VALIDACIÓN DE IMPACTO
-- ============================================================

-- Verificar que los pedidos históricos siguen accesibles
SELECT
  num_pedido,
  alm_envia,
  fecha_envio,
  created_at
FROM tbl_pedidos_rep
WHERE alm_envia = '140'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- ROLLBACK (en caso de necesitar reactivarlo)
-- ============================================================

-- Si necesitas reactivar el almacén ALM140:
-- UPDATE tbl_almacenes
-- SET activo = TRUE
-- WHERE codigo_alm = '140';

-- ============================================================
-- NOTAS TÉCNICAS
-- ============================================================

-- El código ya está preparado para filtrar almacenes inactivos:
-- - getAllWarehouses() usa .eq('activo', true) en data.ts línea 62
-- - getUserWarehouses() usa .eq('activo', true) en data.ts línea 117
--
-- Después de ejecutar esta migración:
-- ✅ ALM140 NO aparecerá en dropdown de nuevos pedidos
-- ✅ Los pedidos históricos de ALM140 seguirán visibles
-- ✅ Los usuarios que tenían ALM140 en su ambito_almacenes NO podrán crear nuevos pedidos en ese almacén
-- ✅ El almacén permanece en la base de datos para auditoría e histórico

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
