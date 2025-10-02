-- Script para limpiar registros basura de tbl_historico_cambios
-- Ejecuta este script UNA VEZ en Supabase SQL Editor

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
