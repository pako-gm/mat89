-- Verificar si los ámbitos se están guardando realmente
SELECT
  user_id,
  email,
  user_role,
  ambito_almacenes,
  CASE
    WHEN ambito_almacenes IS NULL THEN 'NULL'
    WHEN ambito_almacenes = '{}' THEN 'Array vacío'
    WHEN array_length(ambito_almacenes, 1) IS NULL THEN 'Array vacío (null length)'
    ELSE 'Tiene ' || array_length(ambito_almacenes, 1)::text || ' elementos'
  END as estado_ambito
FROM user_profiles
WHERE email = 'angel.aparisi@renfe.es';
