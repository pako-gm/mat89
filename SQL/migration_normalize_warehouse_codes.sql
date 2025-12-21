-- ================================================================
-- MIGRACIÓN: Normalizar códigos de almacén en pedidos existentes
-- ================================================================
-- Fecha: 2025-11-30
-- Rama: AMBITO-ALMACENES
--
-- Este script elimina el prefijo "ALM" de los códigos de almacén
-- en la tabla tbl_pedidos_rep para compatibilidad con el nuevo sistema.
--
-- IMPORTANTE: Hacer backup antes de ejecutar
-- ================================================================

-- ============================================================
-- PASO 1: VERIFICAR DATOS ACTUALES (solo lectura)
-- ============================================================

-- Ver formato actual de los datos
SELECT
  id_pedido,
  num_pedido,
  alm_envia,
  CASE
    WHEN alm_envia LIKE 'ALM%' THEN 'Con prefijo ALM'
    ELSE 'Sin prefijo'
  END as formato_actual
FROM tbl_pedidos_rep
ORDER BY created_at DESC
LIMIT 20;

-- Contar pedidos con prefijo vs sin prefijo
SELECT
  CASE
    WHEN alm_envia LIKE 'ALM%' THEN 'Con prefijo ALM'
    ELSE 'Sin prefijo'
  END as formato,
  COUNT(*) as cantidad
FROM tbl_pedidos_rep
GROUP BY formato;

-- ============================================================
-- PASO 2: ACTUALIZAR CAMPO alm_envia
-- ============================================================

-- Eliminar prefijo "ALM" del campo alm_envia
-- Ejemplo: "ALM140" -> "140"
UPDATE tbl_pedidos_rep
SET alm_envia = REPLACE(alm_envia, 'ALM', '')
WHERE alm_envia LIKE 'ALM%';

-- Verificar actualización
SELECT
  'Después de actualizar alm_envia:' as paso,
  COUNT(*) as total_pedidos,
  COUNT(CASE WHEN alm_envia LIKE 'ALM%' THEN 1 END) as con_prefijo,
  COUNT(CASE WHEN alm_envia NOT LIKE 'ALM%' THEN 1 END) as sin_prefijo
FROM tbl_pedidos_rep;

-- ============================================================
-- PASO 3: ACTUALIZAR CAMPO num_pedido
-- ============================================================

-- Actualizar num_pedido eliminando "ALM" del código de almacén
-- Ejemplo: "ALM141/25/1030" -> "141/25/1030"

-- NOTA: Este UPDATE es más complejo porque necesitamos extraer y reconstruir el número

-- Opción 1: Si todos los números tienen el formato "ALM###/YY/####"
UPDATE tbl_pedidos_rep
SET num_pedido = REPLACE(num_pedido, 'ALM', '')
WHERE num_pedido LIKE 'ALM%';

-- Verificar actualización
SELECT
  'Después de actualizar num_pedido:' as paso,
  COUNT(*) as total_pedidos,
  COUNT(CASE WHEN num_pedido LIKE 'ALM%' THEN 1 END) as con_prefijo,
  COUNT(CASE WHEN num_pedido NOT LIKE 'ALM%' THEN 1 END) as sin_prefijo
FROM tbl_pedidos_rep;

-- ============================================================
-- PASO 4: VERIFICACIÓN FINAL
-- ============================================================

-- Ver muestra de pedidos actualizados
SELECT
  id_pedido,
  num_pedido,
  alm_envia,
  created_at
FROM tbl_pedidos_rep
ORDER BY created_at DESC
LIMIT 20;

-- Obtener el último correlativo del año actual
SELECT
  num_pedido,
  alm_envia,
  created_at
FROM tbl_pedidos_rep
WHERE num_pedido LIKE '%/25/%'
ORDER BY num_pedido DESC
LIMIT 5;

-- ============================================================
-- PASO 5: VALIDACIÓN DE INTEGRIDAD
-- ============================================================

-- Verificar que no haya valores NULL
SELECT
  COUNT(*) as pedidos_con_alm_envia_null
FROM tbl_pedidos_rep
WHERE alm_envia IS NULL OR alm_envia = '';

SELECT
  COUNT(*) as pedidos_con_num_pedido_null
FROM tbl_pedidos_rep
WHERE num_pedido IS NULL OR num_pedido = '';

-- Verificar formato correcto del nuevo formato
-- Debe ser: ###/##/####
SELECT
  num_pedido,
  CASE
    WHEN num_pedido ~ '^[0-9]{3}/[0-9]{2}/[0-9]{4}$' THEN 'Formato correcto'
    ELSE 'Formato incorrecto'
  END as validacion
FROM tbl_pedidos_rep
WHERE num_pedido NOT LIKE 'ALM%'
LIMIT 50;

-- ============================================================
-- ROLLBACK (en caso de error)
-- ============================================================

-- Si algo sale mal y necesitas revertir:
-- NOTA: Solo funciona si hiciste un backup antes

-- Restaurar desde backup:
-- pg_restore -U postgres -d tu_base_de_datos backup_antes_migracion.sql

-- O si guardaste los valores antiguos en una tabla temporal:
-- UPDATE tbl_pedidos_rep
-- SET alm_envia = temp_backup.alm_envia_old,
--     num_pedido = temp_backup.num_pedido_old
-- FROM temp_backup_pedidos temp_backup
-- WHERE tbl_pedidos_rep.id_pedido = temp_backup.id_pedido;

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
