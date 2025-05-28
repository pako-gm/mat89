/*
  # Insert sample data
  
  1. Changes
    - Insert sample orders with user_id
    - Insert sample order lines
    - Insert sample change history
  
  2. Notes
    - Using a default user ID for sample data
    - All timestamps are set to current time
*/

-- First, get or create a test user ID
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Try to get an existing user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    -- If no user exists, create one
    IF test_user_id IS NULL THEN
        INSERT INTO auth.users (id, email)
        VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com')
        RETURNING id INTO test_user_id;
    END IF;

    -- Insert sample orders with the user_id
    INSERT INTO tbl_pedidos_rep (
        id, 
        num_pedido, 
        alm_envia, 
        razon_social, 
        vehiculo, 
        garantia, 
        fecha_desmonte, 
        fecha_envio, 
        averia_declarada,
        user_id
    )
    VALUES
        ('11111111-1111-1111-1111-111111111111', '141/25/1001', 'ALM141', 'ALS001', '252-058', false, '2025-05-15', '2025-05-17', 'FALLO EN SISTEMA DE FRENOS', test_user_id),
        ('22222222-2222-2222-2222-222222222222', '141/25/1002', 'ALM141', 'BMF001', '252-059', true, '2025-05-16', '2025-05-18', 'RUIDO ANORMAL EN MOTOR', test_user_id),
        ('33333333-3333-3333-3333-333333333333', '141/25/1003', 'ALM141', 'CAF001', '252-060', false, '2025-05-17', '2025-05-19', 'REVISIÓN GENERAL', test_user_id);
END $$;

-- Insert sample order lines
INSERT INTO tbl_ln_pedidos_rep (
    id, 
    pedido_id, 
    matriculas, 
    descripcion, 
    nenv, 
    nsenv
)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '89654014', 'PASTILLAS DE FRENO', 2, 'ST/3145874'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '89654015', 'DISCO DE FRENO', 1, 'ST/3145875'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '89654016', 'MOTOR ELÉCTRICO', 1, 'ST/3145876'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', '89654017', 'FILTRO DE AIRE', 4, 'ST/3145877'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', '89654018', 'ACEITE MOTOR', 2, 'ST/3145878');

-- Insert sample change history
INSERT INTO tbl_historico_cambios (
    id, 
    pedido_id, 
    descripcion_cambio,
    usuario
)
VALUES
    ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Creación pedido', 'SISTEMA'),
    ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'Creación pedido', 'SISTEMA'),
    ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Actualización garantía', 'SISTEMA'),
    ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Creación pedido', 'SISTEMA');