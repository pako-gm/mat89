-- Script para limpiar registros basura de tbl_historico_cambios
-- Ejecuta este script UNA VEZ en Supabase SQL Editor

-- Primero, ver qué registros se van a eliminar
SELECT id, pedido_id, descripcion_cambio, usuario, created_at
FROM tbl_historico_cambios
WHERE descripcion_cambio IS NULL
   OR descripcion_cambio = ''
   OR TRIM(descripcion_cambio) = '';

-- Eliminar registros con descripcion_cambio NULL o vacía
DELETE FROM tbl_historico_cambios
WHERE descripcion_cambio IS NULL
   OR descripcion_cambio = ''
   OR TRIM(descripcion_cambio) = '';

-- Verificar cuántos registros quedan
SELECT COUNT(*) as total_comentarios_validos
FROM tbl_historico_cambios
WHERE descripcion_cambio IS NOT NULL
  AND TRIM(descripcion_cambio) != '';

-- Ver todos los comentarios válidos que quedan
SELECT id, pedido_id, descripcion_cambio, usuario, created_at
FROM tbl_historico_cambios
WHERE descripcion_cambio IS NOT NULL
  AND TRIM(descripcion_cambio) != ''
ORDER BY created_at DESC;
