-- ============================================================================
-- MIGRACIÓN: Sistema de Correlativo Global Único
-- ============================================================================
-- Propósito: Eliminar race conditions en la generación de números de pedido
-- Fecha: 2024-12-03
-- ============================================================================

-- ============================================================================
-- TABLA: Contador Global de Correlativos
-- ============================================================================
-- Esta tabla almacena UN ÚNICO contador que se incrementa
-- independientemente del almacén o año
-- IMPORTANTE: Se inicializa desde el MAX de pedidos existentes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tbl_correlativo_global (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_sequential INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)  -- Solo permite una fila
);

-- Índice para optimizar updates
CREATE INDEX IF NOT EXISTS idx_correlativo_global_updated
ON public.tbl_correlativo_global(last_updated);

-- ============================================================================
-- FUNCIÓN: Generar Siguiente Número de Pedido
-- ============================================================================
-- Genera el siguiente número de pedido de forma ATÓMICA
-- Formato: {numAlmacen}/{YY}/{correlativo}
-- Ejemplo: 141/25/1001
-- Thread-safe: Usa UPDATE atómico en PostgreSQL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_next_correlativo(p_almacen_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- Ejecuta con permisos de owner para bypasear RLS
SET search_path = public
AS $$
DECLARE
  v_year_suffix TEXT;
  v_almacen_num TEXT;
  v_next_sequential INTEGER;
  v_order_number TEXT;
BEGIN
  -- Obtener año actual en formato YY (ej: '25' para 2025)
  v_year_suffix := TO_CHAR(CURRENT_DATE, 'YY');

  -- Extraer solo los números del código de almacén
  -- Ejemplos: 'ALM141' -> '141', '141' -> '141', 'ALM-140' -> '140'
  v_almacen_num := REGEXP_REPLACE(p_almacen_code, '[^0-9]', '', 'g');

  -- Si no hay números en el código, usar el código completo
  IF v_almacen_num = '' OR v_almacen_num IS NULL THEN
    v_almacen_num := p_almacen_code;
  END IF;

  -- INCREMENTAR EL CONTADOR GLOBAL de forma atómica
  -- Este UPDATE es thread-safe gracias a las transacciones de PostgreSQL
  -- Si múltiples usuarios ejecutan esto simultáneamente, PostgreSQL
  -- garantiza que cada uno obtenga un número diferente
  UPDATE public.tbl_correlativo_global
  SET
    last_sequential = last_sequential + 1,
    last_updated = NOW()
  WHERE id = 1
  RETURNING last_sequential INTO v_next_sequential;

  -- Verificar que se obtuvo un número
  IF v_next_sequential IS NULL THEN
    RAISE EXCEPTION 'Error crítico: No se pudo obtener el siguiente correlativo. Verifique que la tabla tbl_correlativo_global esté inicializada.';
  END IF;

  -- Formatear el número de pedido: 141/25/1001
  v_order_number := v_almacen_num || '/' || v_year_suffix || '/' || v_next_sequential;

  -- Log para debugging (visible en logs de Supabase)
  RAISE NOTICE 'Número de pedido generado: % para almacén %', v_order_number, p_almacen_code;

  RETURN v_order_number;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Preview del Próximo Número (SIN incrementar)
-- ============================================================================
-- Retorna una vista previa del próximo número de pedido SIN consumir el contador
-- Útil para mostrar al usuario qué número aproximado tendrá su pedido
-- NOTA: El número real puede ser diferente si otros usuarios guardan antes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preview_next_correlativo(p_almacen_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_suffix TEXT;
  v_almacen_num TEXT;
  v_current_sequential INTEGER;
  v_preview_number TEXT;
BEGIN
  -- Obtener año actual en formato YY (ej: '25' para 2025)
  v_year_suffix := TO_CHAR(CURRENT_DATE, 'YY');

  -- Extraer solo los números del código de almacén
  v_almacen_num := REGEXP_REPLACE(p_almacen_code, '[^0-9]', '', 'g');

  -- Si no hay números en el código, usar el código completo
  IF v_almacen_num = '' OR v_almacen_num IS NULL THEN
    v_almacen_num := p_almacen_code;
  END IF;

  -- Leer el contador actual SIN incrementarlo
  SELECT last_sequential INTO v_current_sequential
  FROM public.tbl_correlativo_global
  WHERE id = 1;

  -- Si no existe el contador, retornar preview con 1000
  IF v_current_sequential IS NULL THEN
    v_current_sequential := 999;
  END IF;

  -- Formatear el número preview (siguiente número esperado)
  v_preview_number := 'PREV-' || v_almacen_num || '/' || v_year_suffix || '/' || (v_current_sequential + 1);

  RETURN v_preview_number;
END;
$$;

-- ============================================================================
-- FUNCIÓN: Inicializar Contador desde Pedidos Existentes
-- ============================================================================
-- Esta función lee el MAX correlativo de TODOS los pedidos existentes
-- y lo usa como punto de partida para el contador global
-- Se ejecuta automáticamente al aplicar la migración
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_correlativo_global()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_sequential INTEGER;
  v_count_pedidos INTEGER;
BEGIN
  -- Contar cuántos pedidos existen con el formato correcto
  SELECT COUNT(*)
  INTO v_count_pedidos
  FROM public.tbl_pedidos_rep
  WHERE num_pedido ~ '^[0-9]+/[0-9]{2}/[0-9]+$';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Inicializando contador global';
  RAISE NOTICE 'Pedidos encontrados con formato válido: %', v_count_pedidos;

  -- Encontrar el MAX correlativo de TODOS los pedidos existentes
  -- Extrae el último número después del último '/'
  -- Ejemplos: '141/25/1035' -> 1035, '140/24/999' -> 999
  SELECT MAX(
    CAST(
      SUBSTRING(num_pedido FROM '[0-9]+$') AS INTEGER
    )
  )
  INTO v_max_sequential
  FROM public.tbl_pedidos_rep
  WHERE num_pedido ~ '^[0-9]+/[0-9]{2}/[0-9]+$';  -- Valida formato correcto

  -- Si no hay pedidos con formato válido, empezar en 999
  -- (el primer pedido generado será 1000)
  IF v_max_sequential IS NULL THEN
    v_max_sequential := 999;
    RAISE NOTICE 'No se encontraron pedidos con formato válido';
    RAISE NOTICE 'Iniciando contador en: 999';
    RAISE NOTICE 'El primer pedido generado será: XXXX/YY/1000';
  ELSE
    RAISE NOTICE 'Máximo correlativo encontrado: %', v_max_sequential;
    RAISE NOTICE 'El próximo pedido generado será: XXXX/YY/%', v_max_sequential + 1;
  END IF;

  -- INSERTAR o ACTUALIZAR el contador global con el valor encontrado
  INSERT INTO public.tbl_correlativo_global (id, last_sequential, last_updated)
  VALUES (1, v_max_sequential, NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    last_sequential = EXCLUDED.last_sequential,
    last_updated = EXCLUDED.last_updated;

  RAISE NOTICE 'Contador global inicializado exitosamente';
  RAISE NOTICE '========================================';
END;
$$;

-- ============================================================================
-- EJECUTAR INICIALIZACIÓN
-- ============================================================================
-- Esto lee el MAX de pedidos existentes y configura el contador
-- ============================================================================

SELECT public.initialize_correlativo_global();

-- Verificar que se inicializó correctamente
DO $$
DECLARE
  v_current_value INTEGER;
BEGIN
  SELECT last_sequential INTO v_current_value
  FROM public.tbl_correlativo_global
  WHERE id = 1;

  IF v_current_value IS NULL THEN
    RAISE EXCEPTION 'ERROR: La tabla tbl_correlativo_global no se inicializó correctamente';
  ELSE
    RAISE NOTICE '✓ Verificación exitosa: Contador inicializado en %', v_current_value;
  END IF;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Políticas de seguridad para proteger la tabla de contador
-- Solo las funciones del sistema pueden modificarla
-- ============================================================================

ALTER TABLE public.tbl_correlativo_global ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (hace la migración idempotente)
DROP POLICY IF EXISTS "Authenticated users can view counter" ON public.tbl_correlativo_global;
DROP POLICY IF EXISTS "Only functions can modify counter" ON public.tbl_correlativo_global;
DROP POLICY IF EXISTS "No manual inserts" ON public.tbl_correlativo_global;
DROP POLICY IF EXISTS "No manual deletes" ON public.tbl_correlativo_global;

-- Usuarios autenticados pueden VER el contador (solo lectura)
CREATE POLICY "Authenticated users can view counter"
ON public.tbl_correlativo_global
FOR SELECT
TO authenticated
USING (true);

-- Solo las funciones del sistema pueden MODIFICAR el contador
-- Esto previene modificaciones manuales accidentales
CREATE POLICY "Only functions can modify counter"
ON public.tbl_correlativo_global
FOR UPDATE
TO authenticated
USING (false)  -- Ningún usuario puede hacer UPDATE directo
WITH CHECK (false);

-- Prevenir INSERT y DELETE manuales
CREATE POLICY "No manual inserts"
ON public.tbl_correlativo_global
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No manual deletes"
ON public.tbl_correlativo_global
FOR DELETE
TO authenticated
USING (false);

-- ============================================================================
-- PERMISOS
-- ============================================================================

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.generate_next_correlativo(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_next_correlativo(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_correlativo_global() TO authenticated;

-- Dar permisos de lectura en la tabla
GRANT SELECT ON public.tbl_correlativo_global TO authenticated;

-- ============================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE public.tbl_correlativo_global IS
'Tabla que almacena el contador global único para números de pedido. Solo debe tener UNA fila. Se inicializa desde el MAX de pedidos existentes.';

COMMENT ON COLUMN public.tbl_correlativo_global.id IS
'ID fijo = 1. Solo puede existir una fila gracias al constraint single_row.';

COMMENT ON COLUMN public.tbl_correlativo_global.last_sequential IS
'Último número correlativo usado. Se incrementa automáticamente con cada pedido. Inicializado desde el MAX de pedidos existentes.';

COMMENT ON COLUMN public.tbl_correlativo_global.last_updated IS
'Timestamp de la última vez que se generó un número de pedido.';

COMMENT ON FUNCTION public.generate_next_correlativo(TEXT) IS
'Genera el siguiente número de pedido de forma atómica y thread-safe. Formato: ALMACEN/YY/CORRELATIVO. El correlativo es único globalmente.';

COMMENT ON FUNCTION public.preview_next_correlativo(TEXT) IS
'Retorna preview del próximo número de pedido SIN incrementar el contador. Formato: PREV-ALMACEN/YY/CORRELATIVO. Útil para mostrar al usuario antes de guardar.';

COMMENT ON FUNCTION public.initialize_correlativo_global() IS
'Inicializa el contador global desde el MAX de pedidos existentes en tbl_pedidos_rep. Ejecutada automáticamente en la migración.';

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================
