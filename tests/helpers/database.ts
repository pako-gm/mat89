/**
 * Helpers para operaciones de base de datos en tests
 * Sistema de Material Repair Management
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseTest = createClient(supabaseUrl, supabaseKey);

/**
 * Crear un material de prueba
 */
export async function createTestMaterial(registration: number = 89876543, name: string = 'Material Test') {
  const { data, error } = await supabaseTest
    .from('tbl_materiales')
    .insert({
      num_registro: registration,
      nombre: name,
      descripcion: 'MODULO DE FRENADO DE PRUEBA',
      serie_vehiculo: '999',
    })
    .select()
    .single();

  if (error) throw new Error(`Error creating test material: ${error.message}`);
  return data;
}

/**
 * Crear un proveedor de prueba
 */
export async function createTestSupplier(
  name: string = 'ACME INC',
  isExternal: boolean = true
) {
  const { data, error } = await supabaseTest
    .from('tbl_proveedores')
    .insert({
      nombre: name,
      es_externo: isExternal,
    })
    .select()
    .single();

  if (error) throw new Error(`Error creating test supplier: ${error.message}`);
  return data;
}

/**
 * Crear un pedido de prueba con garantía
 */
export async function createTestOrderWithWarranty(params: {
  supplierId: string;
  warehouse: string;
  materials: Array<{ registration: number; quantity: number }>;
  warranty: boolean;
  userId: string;
}) {
  const orderNumber = `TEST/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`;

  // Crear pedido
  const { data: order, error: orderError } = await supabaseTest
    .from('tbl_pedidos_rep')
    .insert({
      num_pedido: orderNumber,
      proveedor_id: params.supplierId,
      alm_envia: params.warehouse,
      garantia: params.warranty,
      fecha_envio: new Date().toISOString().split('T')[0],
      user_id: params.userId,
      estado_pedido: 'enviado',
    })
    .select()
    .single();

  if (orderError) throw new Error(`Error creating test order: ${orderError.message}`);

  // Crear líneas de pedido
  for (const material of params.materials) {
    await supabaseTest
      .from('tbl_lineas_pedidos_rep')
      .insert({
        pedido_id: order.id,
        num_registro: material.registration,
        cantidad: material.quantity,
        n_serie: `TEST-SN-${material.registration}`,
      });
  }

  return order;
}

/**
 * Crear una recepción de prueba
 */
export async function createTestReception(params: {
  orderId: string;
  lineId: string;
  warehouseReceives: string;
  status: 'UTIL' | 'IRREPARABLE' | 'SIN ACTUACION' | 'OTROS';
  quantity: number;
  warrantyAccepted?: boolean;
  rejectionReason?: string;
}) {
  const { data, error } = await supabaseTest
    .from('tbl_recepciones')
    .insert({
      pedido_id: params.orderId,
      linea_pedido_id: params.lineId,
      fecha_recepcion: new Date().toISOString().split('T')[0],
      estado_recepcion: params.status,
      n_rec: params.quantity,
      alm_recepciona: params.warehouseReceives,
      garantia_aceptada_proveedor: params.warrantyAccepted,
      motivo_rechazo_garantia: params.rejectionReason,
    })
    .select()
    .single();

  if (error) throw new Error(`Error creating test reception: ${error.message}`);
  return data;
}

/**
 * Limpiar datos de prueba
 */
export async function cleanupTestData() {
  // Eliminar pedidos de prueba
  await supabaseTest
    .from('tbl_pedidos_rep')
    .delete()
    .like('num_pedido', 'TEST/%');

  // Eliminar materiales de prueba
  await supabaseTest
    .from('tbl_materiales')
    .delete()
    .like('nombre', '%Material Test%');

  // Eliminar proveedores de prueba
  await supabaseTest
    .from('tbl_proveedores')
    .delete()
    .like('nombre', '%Test%');
}

/**
 * Obtener el ID de usuario por email
 */
export async function getUserIdByEmail(email: string): Promise<string> {
  const { data, error } = await supabaseTest
    .from('user_profiles')
    .select('user_id')
    .eq('email', email)
    .single();

  if (error || !data) throw new Error(`User not found: ${email}`);
  return data.user_id;
}