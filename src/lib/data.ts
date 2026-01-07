import { Order, Warehouse, Supplier, Reception, Material, MaterialReception, ConsultaRecord, AppVersion, WarrantyHistoryInfo, WarrantyPreviousOrder, Vehiculo, TipoRevision, Plantilla, PlantillaWithMaterials, PlantillaHistorial } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { supabase } from './supabase';

// ============================================================================
// TEMPORARY FLAG FOR TESTING: Enable real deletion instead of soft delete
// ============================================================================
// IMPORTANTE: Este flag está configurado para borrado REAL (físico) de pedidos
// durante las pruebas del módulo de garantías en localhost.
//
// Para VOLVER al comportamiento original (soft delete / cancelar):
// - Cambiar: export const ENABLE_REAL_ORDER_DELETION = false;
// ============================================================================
export const ENABLE_REAL_ORDER_DELETION = true;

// Database types for Supabase responses
interface DbOrderLine {
  id: string;
  matricula_89: string;
  descripcion: string;
  nenv: number;
  nsenv: string;
  estado_completado?: boolean;
  tbl_recepciones?: DbReception[];
}

interface DbReception {
  id: string;
  pedido_id: string;
  linea_pedido_id: string;
  fecha_recepcion: string;
  estado_recepcion: string;
  n_rec: number;
  ns_rec: string;
  observaciones: string;
  garantia_aceptada_proveedor?: boolean | null;
  motivo_rechazo_garantia?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DbSupplier {
  nombre: string;
}

interface DbLastSupplierResponse {
  fecha_envio: string;
  tbl_proveedores: {
    nombre: string;
  };
}

/**
 * Obtiene todos los almacenes desde la base de datos
 * @returns Promise<Warehouse[]> Array de todos los almacenes activos
 */
export const getAllWarehouses = async (): Promise<Warehouse[]> => {
  try {
    const { data, error } = await supabase
      .from('tbl_almacenes')
      .select('id, codigo_alm, nombre_alm')
      .eq('activo', true)
      .order('codigo_alm', { ascending: true });

    if (error) {
      console.error('Error fetching warehouses:', error);
      return [];
    }

    return (data || []).map(alm => ({
      id: alm.id,
      code: alm.codigo_alm,
      name: alm.nombre_alm
    }));
  } catch (err) {
    console.error('Error in getAllWarehouses:', err);
    return [];
  }
};

/**
 * Obtiene los almacenes permitidos para el usuario actual según su ambito_almacenes
 * @returns Promise<Warehouse[]> Array de almacenes del usuario o vacío si no hay usuario
 */
export const getUserWarehouses = async (): Promise<Warehouse[]> => {
  try {
    // 1. Obtener el usuario actual
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.error('Error getting current user:', userError);
      return [];
    }

    // 2. Obtener el perfil del usuario con su ambito_almacenes
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('ambito_almacenes')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return [];
    }

    if (!profileData || !profileData.ambito_almacenes || profileData.ambito_almacenes.length === 0) {
      console.warn('User has no warehouses assigned');
      return [];
    }

    // 3. Obtener los almacenes del usuario usando los IDs del ambito_almacenes
    const { data: warehousesData, error: warehousesError } = await supabase
      .from('tbl_almacenes')
      .select('id, codigo_alm, nombre_alm')
      .in('id', profileData.ambito_almacenes)
      .eq('activo', true)
      .order('codigo_alm', { ascending: true });

    if (warehousesError) {
      console.error('Error fetching user warehouses:', warehousesError);
      return [];
    }

    return (warehousesData || []).map(alm => ({
      id: alm.id,
      code: alm.codigo_alm,
      name: alm.nombre_alm
    }));
  } catch (err) {
    console.error('Error in getUserWarehouses:', err);
    return [];
  }
};

export const getSuppliers = async () => {
  const { data: suppliers, error } = await supabase
    .from('tbl_proveedores')
    .select('id, nombre, es_externo')
    .order('nombre');

  if (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }

  return suppliers.map(supplier => ({
    id: supplier.id,
    name: supplier.nombre,
    isExternal: supplier.es_externo || false
  }));
};

export const getAllSuppliers = async () => {
  const { data: suppliers, error } = await supabase
    .from('tbl_proveedores')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }

  return suppliers.map(supplier => ({
    id: supplier.id,
    name: supplier.nombre,
    address: supplier.direccion,
    city: supplier.ciudad,
    postalCode: supplier.codigo_postal,
    province: supplier.provincia,
    phone: supplier.telefono,
    email: supplier.email,
    contactPerson: supplier.persona_contacto,
    isExternal: supplier.es_externo,
    notes: supplier.notas,
    createdAt: supplier.created_at,
    updatedAt: supplier.updated_at
  }));
};

export const _getSupplierById = async (id: string) => {
  const { data: supplier, error } = await supabase
    .from('tbl_proveedores')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching supplier:', error);
    return null;
  }

  return {
    id: supplier.id,
    name: supplier.nombre,
    address: supplier.direccion,
    city: supplier.ciudad,
    postalCode: supplier.codigo_postal,
    province: supplier.provincia,
    phone: supplier.telefono,
    email: supplier.email,
    contactPerson: supplier.persona_contacto,
    isExternal: supplier.es_externo,
    notes: supplier.notas,
    createdAt: supplier.created_at,
    updatedAt: supplier.updated_at
  };
};

export const saveSupplier = async (supplier: Supplier) => {
  const { data, error } = await supabase
    .from('tbl_proveedores')
    .upsert({
      id: supplier.id || uuidv4(),
      nombre: supplier.name,
      direccion: supplier.address,
      ciudad: supplier.city,
      codigo_postal: supplier.postalCode,
      provincia: supplier.province,
      telefono: supplier.phone,
      email: supplier.email,
      persona_contacto: supplier.contactPerson,
      es_externo: supplier.isExternal,
      notas: supplier.notes,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving supplier:', error);
    throw error;
  }

  return data;
};

export const deleteSupplier = async (id: string) => {
  // Check if user is ADMINISTRADOR
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No autenticado');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.user_role !== 'ADMINISTRADOR') {
    throw new Error('No tienes permisos para eliminar proveedores. Solo los ADMINISTRADORES pueden realizar esta acción.');
  }

  // First check if supplier has associated orders
  const { data: orders, error: checkError } = await supabase
    .from('tbl_pedidos_rep')
    .select('id')
    .eq('proveedor_id', id)
    .limit(1);

  if (checkError) {
    console.error('Error checking supplier orders:', checkError);
    throw checkError;
  }

  if (orders && orders.length > 0) {
    throw new Error(' No se puede eliminar el proveedor porque tiene pedidos asociados');
  }

  // If no orders, proceed with deletion
  const { error } = await supabase
    .from('tbl_proveedores')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }

  return true;
};

// Materials functions - UPDATED to include new fields
export const getAllMaterials = async (): Promise<Material[]> => {
  const { data: materials, error } = await supabase
    .from('tbl_materiales')
    .select('*')
    .order('descripcion', { ascending: true });

  if (error) {
    console.error('Error fetching materials:', error);
    return [];
  }

  return materials.map(material => ({
    id: material.id,
    registration: material.matricula_89,
    description: material.descripcion,
    vehicleSeries: material.serie_vehiculo,
    infoAdicional: material.info_adicional || '',
    supplierId: material.supplier_id || '', // Campo opcional, no relacionado
    supplierName: '', // Ya no se obtiene de la relación
    createdAt: material.created_at,
    updatedAt: material.updated_at,
    updatedBy: material.updated_by
  }));
};

export const getVehiculos = async (): Promise<Vehiculo[]> => {
  const { data: vehiculos, error } = await supabase
    .from('tbl_vehiculos')
    .select('*')
    .order('codigo_vehiculo', { ascending: true });

  if (error) {
    console.error('Error fetching vehiculos:', error);
    return [];
  }

  return vehiculos.map(vehiculo => ({
    id: vehiculo.id,
    codigo_vehiculo: vehiculo.codigo_vehiculo,
    nombre_vehiculo: vehiculo.nombre_vehiculo,
    created_at: vehiculo.created_at,
    updated_at: vehiculo.updated_at
  }));
};

export const _getMaterialById = async (id: string): Promise<Material | null> => {
  const { data: material, error } = await supabase
    .from('tbl_materiales')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching material:', error);
    return null;
  }

  return {
    id: material.id,
    registration: material.matricula_89,
    description: material.descripcion,
    vehicleSeries: material.serie_vehiculo,
    infoAdicional: material.info_adicional || '',
    supplierId: material.supplier_id || '', // Campo opcional, no relacionado
    supplierName: '', // Ya no se obtiene de la relación
    createdAt: material.created_at,
    updatedAt: material.updated_at,
    updatedBy: material.updated_by
  };
};

// Nueva función: Buscar materiales por matrícula (para autorrellenado)
export const searchMaterialsByRegistration = async (registrationQuery: string): Promise<Material[]> => {
  if (!registrationQuery || registrationQuery.length < 2) {
    return [];
  }

  console.log('[searchMaterialsByRegistration] Searching for:', registrationQuery);

  // Convertir el query string a número para el rango
  const queryNum = parseInt(registrationQuery);

  // Calcular el rango: por ejemplo, si buscan "89765", buscar entre 89765000 y 89765999
  // Para eso, multiplicamos por 10^(8-length) para el límite inferior
  // y sumamos 10^(8-length) - 1 para el límite superior
  const digitsRemaining = 8 - registrationQuery.length;
  const lowerBound = queryNum * Math.pow(10, digitsRemaining);
  const upperBound = (queryNum + 1) * Math.pow(10, digitsRemaining) - 1;

  console.log('[searchMaterialsByRegistration] Range:', lowerBound, 'to', upperBound);

  // Buscar materiales en el rango calculado
  const { data: materials, error } = await supabase
    .from('tbl_materiales')
    .select('*')
    .gte('matricula_89', lowerBound)
    .lte('matricula_89', upperBound)
    .order('matricula_89', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[searchMaterialsByRegistration] Error:', error);
    return [];
  }

  if (!materials || materials.length === 0) {
    console.log('[searchMaterialsByRegistration] No materials found');
    return [];
  }

  // Filtrar localmente para asegurar que EMPIECEN con los dígitos
  const filtered = materials.filter(material => {
    const matStr = String(material.matricula_89);
    return matStr.startsWith(registrationQuery);
  }).slice(0, 10); // Limitar a 10 resultados

  console.log('[searchMaterialsByRegistration] Found materials:', filtered.length);
  console.log('[searchMaterialsByRegistration] Filtered results:', filtered.map(m => m.matricula_89));

  return filtered.map(material => ({
    id: material.id,
    registration: material.matricula_89,
    description: material.descripcion,
    vehicleSeries: material.serie_vehiculo,
    infoAdicional: material.info_adicional || '',
    supplierId: material.supplier_id || '',
    supplierName: '',
    createdAt: material.created_at,
    updatedAt: material.updated_at,
    updatedBy: material.updated_by
  }));
};

// Nueva función: Obtener material por matrícula exacta
export const getMaterialByRegistration = async (registration: number): Promise<Material | null> => {
  const { data: material, error } = await supabase
    .from('tbl_materiales')
    .select('*')
    .eq('matricula_89', registration)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No se encontró el registro
      return null;
    }
    console.error('Error fetching material by registration:', error);
    return null;
  }

  return {
    id: material.id,
    registration: material.matricula_89,
    description: material.descripcion,
    vehicleSeries: material.serie_vehiculo,
    infoAdicional: material.info_adicional || '',
    supplierId: material.supplier_id || '',
    supplierName: '',
    createdAt: material.created_at,
    updatedAt: material.updated_at,
    updatedBy: material.updated_by
  };
};

export const saveMaterial = async (material: Material): Promise<any> => {
  const materialData: any = {
    id: material.id || uuidv4(),
    matricula_89: material.registration,
    descripcion: material.description,
    serie_vehiculo: material.vehicleSeries,
    info_adicional: material.infoAdicional || '',
    updated_at: new Date().toISOString()
    // updated_by se manejará automáticamente por el trigger de la base de datos
  };

  // Solo incluir supplier_id si existe y no está vacío
  if (material.supplierId && material.supplierId.trim()) {
    materialData.supplier_id = material.supplierId;
  }

  const { data, error } = await supabase
    .from('tbl_materiales')
    .upsert(materialData)
    .select()
    .single();

  if (error) {
    console.error('Error saving material:', error);
    throw error;
  }

  return data;
};

export const deleteMaterial = async (id: string): Promise<boolean> => {
  // Check if user is ADMINISTRADOR
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No autenticado');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.user_role !== 'ADMINISTRADOR') {
    throw new Error('No tienes permisos para eliminar materiales. Solo los ADMINISTRADORES pueden realizar esta acción.');
  }

  // First, get the material's registration number
  const { data: material, error: materialError } = await supabase
    .from('tbl_materiales')
    .select('matricula_89')
    .eq('id', id)
    .single();

  if (materialError) {
    console.error('Error fetching material:', materialError);
    throw materialError;
  }

  // Check if material has associated order lines
  const { data: orderLines, error: checkError } = await supabase
    .from('tbl_ln_pedidos_rep')
    .select('id')
    .eq('matricula_89', material.matricula_89)
    .limit(1);

  if (checkError) {
    console.error('Error checking material order lines:', checkError);
    throw checkError;
  }

  if (orderLines && orderLines.length > 0) {
    throw new Error('No se puede eliminar el material, hay pedidos grabados con esa matricula.');
  }

  // If no order lines, proceed with deletion
  const { error } = await supabase
    .from('tbl_materiales')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting material:', error);
    throw error;
  }

  return true;
};

export const checkMaterialRegistrationExists = async (registration: number, excludeId?: string): Promise<boolean> => {
  let query = supabase
    .from('tbl_materiales')
    .select('id')
    .eq('matricula_89', registration);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking material registration:', error);
    return false;
  }

  return data && data.length > 0;
};

export const getLastSupplierForMaterial = async (matricula: number) => {
  const { data, error } = await supabase
    .from('tbl_pedidos_rep')
    .select(`
      fecha_envio,
      tbl_proveedores!inner(nombre),
      tbl_ln_pedidos_rep!inner(matricula_89)
    `)
    .eq('tbl_ln_pedidos_rep.matricula_89', String(matricula))
    .eq('cancelado', false)
    .not('fecha_envio', 'is', null)
    .order('fecha_envio', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching last supplier for material:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  const typedData = data as unknown as DbLastSupplierResponse;

  return {
    supplierName: typedData.tbl_proveedores.nombre,
    shipmentDate: typedData.fecha_envio
  };
};

// Empty the sample orders array
export const _sampleOrders: Order[] = [];

export const saveOrder = async (order: Order) => {
  // Get the current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  // Check if user exists and has ID
  if (userError || !userData.user || !userData.user.id) {
    console.error("Authentication error:", userError);
    throw new Error("No se pudo obtener el ID del usuario. Por favor, inicie sesión nuevamente.");
  }
  
  const userId = userData.user.id;

  // FASE 2: Validar que el usuario tenga permisos para el almacén seleccionado
  try {
    // 1. Obtener el perfil del usuario con su ambito_almacenes
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('ambito_almacenes')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('No se pudo verificar los permisos del usuario.');
    }

    if (!profileData || !profileData.ambito_almacenes || profileData.ambito_almacenes.length === 0) {
      throw new Error('No tienes almacenes asignados. Contacta con el administrador.');
    }

    // 2. Obtener el ID del almacén seleccionado
    const { data: warehouseData, error: warehouseError } = await supabase
      .from('tbl_almacenes')
      .select('id')
      .eq('codigo_alm', order.warehouse)
      .single();

    if (warehouseError || !warehouseData) {
      console.error('Error fetching warehouse:', warehouseError);
      throw new Error(`El almacén ${order.warehouse} no existe.`);
    }

    // 3. Verificar que el almacén esté en el ambito del usuario
    if (!profileData.ambito_almacenes.includes(warehouseData.id)) {
      throw new Error(`No tienes permisos para crear/editar pedidos en el almacén ${order.warehouse}.`);
    }

    // FASE GARANTÍA: Validar que no haya envío pendiente de recepción
    if (order.warranty && order.supplierId) {
      console.log('[saveOrder] Validating warranty status for order with warranty=true');

      // Obtener materiales del pedido
      const materials = order.orderLines
        .map(l => parseInt(l.registration))
        .filter(reg => !isNaN(reg));

      if (materials.length > 0) {
        // Verificar estado de garantía
        const warrantyStatus = await checkWarrantyStatus(materials, order.supplierId, order.id);

        // Bloquear si algún material no puede enviarse con garantía
        for (const materialStatus of warrantyStatus) {
          if (!materialStatus.canSendWithWarranty) {
            console.error(`[saveOrder] Warranty validation FAILED for material ${materialStatus.materialRegistration}`);
            throw new Error(
              `Material ${materialStatus.materialRegistration}: ${materialStatus.blockingReason}`
            );
          }
        }

        console.log('[saveOrder] Warranty validation PASSED - all materials OK');
      }
    }

    // ===== VALIDACIÓN Y RETRY DE NÚMERO DE PEDIDO =====
    let finalOrderNumber = order.orderNumber;
    let numberWasRegenerated = false;
    const maxRetries = 5; // 5 reintentos según preferencia del usuario

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Verificar si el número actual ya existe
      const exists = await checkOrderNumberExists(finalOrderNumber, order.id);

      if (!exists) {
        // Número disponible, continuar
        break;
      }

      // Número ocupado, regenerar
      console.warn(`⚠️ [saveOrder] Número ${finalOrderNumber} ocupado (intento ${attempt}/${maxRetries})`);

      const newNumber = await generateUniqueOrderNumber(
        order.warehouse,
        order.id,
        5
      );

      if (!newNumber) {
        throw new Error(
          `No se pudo generar un número de pedido único después de 5 intentos. ` +
          `Por favor, intente nuevamente en unos segundos.`
        );
      }

      finalOrderNumber = newNumber;
      numberWasRegenerated = true;
    }

    if (numberWasRegenerated) {
      console.log(`🔄 Número regenerado: ${order.orderNumber} → ${finalOrderNumber}`);
    }
    // ===== FIN VALIDACIÓN Y RETRY =====

    // Continuar con el guardado si la validación pasó
    const { data: savedOrder, error: orderError } = await supabase
      .from('tbl_pedidos_rep')
      .upsert({
        id: order.id,
        num_pedido: finalOrderNumber, // ← USAR NÚMERO VALIDADO
        alm_envia: order.warehouse,
        proveedor_id: order.supplierId,
        vehiculo: order.vehicle,
        garantia: order.warranty,
        informacion_nc: order.nonConformityReport,
        fecha_desmonte: order.dismantleDate,
        fecha_envio: order.shipmentDate,
        averia_declarada: order.declaredDamage,
        documentacion: order.shipmentDocumentation,
        enviado_sin_garantia: order.enviadoSinGarantia || false,
        user_id: userId // Use explicit user ID
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error saving order:", orderError);

      // Manejar error de UNIQUE constraint (fallback)
      if (orderError.code === '23505' || orderError.message.includes('duplicate key')) {
        throw new Error(
          `El número de pedido ${finalOrderNumber} fue tomado por otro usuario. ` +
          `Por favor, intente guardar nuevamente.`
        );
      }

      throw new Error(orderError.message);
    }

    // Delete orphaned order lines (lines that were removed from the order)
    const currentLineIds = order.orderLines.map(line => line.id);
    const { error: deleteError } = await supabase
      .from('tbl_ln_pedidos_rep')
      .delete()
      .eq('pedido_id', order.id)
      .not('id', 'in', `(${currentLineIds.join(',')})`);

    if (deleteError) {
      console.error("Error deleting orphaned lines:", deleteError);
      throw new Error(deleteError.message);
    }

    // Save order lines using upsert
    const { error: linesError } = await supabase
      .from('tbl_ln_pedidos_rep')
      .upsert(
        order.orderLines.map(line => ({
          id: line.id,
          pedido_id: order.id,
          matricula_89: line.registration || "",
          descripcion: line.partDescription,
          nenv: parseInt(String(line.quantity), 10) || 1,
          nsenv: line.serialNumber
        }))
      );

    if (linesError) {
      console.error("Error saving order lines:", linesError);
      throw new Error(linesError.message);
    }

    // Save change history using upsert to prevent duplicates
    // Filter out items with empty or undefined descriptions
    const validChangeHistory = order.changeHistory.filter(change =>
      change.description && change.description.trim().length > 0
    );

    if (validChangeHistory.length > 0) {
      const historyToSave = validChangeHistory.map(change => ({
        id: change.id,
        pedido_id: order.id,
        descripcion_cambio: change.description,
        usuario: change.user || userData.user?.email || 'SISTEMA',
        ...(change.date ? { created_at: change.date } : {})
      }));

      const { error: historyError } = await supabase
        .from('tbl_historico_cambios')
        .upsert(historyToSave, {
          onConflict: 'id'
        });

      if (historyError) {
        console.error("Error saving change history:", historyError);
        throw new Error(historyError.message);
      }
    }

    // Retornar con información de regeneración
    return {
      ...savedOrder,
      _numberWasRegenerated: numberWasRegenerated,
      _finalOrderNumber: finalOrderNumber
    };
  } catch (error) {
    console.error("Error in saveOrder:", error);
    throw error;
  }
};

/**
 * Verifica si un número de pedido ya existe en la base de datos
 * @param orderNumber - Número de pedido a verificar (ej: "141/25/1050")
 * @param excludeOrderId - ID del pedido a excluir (para edición)
 * @returns true si existe, false si está disponible
 */
export const checkOrderNumberExists = async (
  orderNumber: string,
  excludeOrderId?: string
): Promise<boolean> => {
  try {
    let query = supabase
      .from('tbl_pedidos_rep')
      .select('id')
      .eq('num_pedido', orderNumber);

    if (excludeOrderId) {
      query = query.neq('id', excludeOrderId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('Error checking order number existence:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error in checkOrderNumberExists:', error);
    return false;
  }
};

/**
 * Genera un número de pedido único con reintentos automáticos
 * @param warehouseCode - Código del almacén (ej: "141")
 * @param currentOrderId - ID del pedido actual (para edición)
 * @param maxRetries - Máximo de intentos (default: 5)
 * @returns Número único o null si falla
 */
export const generateUniqueOrderNumber = async (
  warehouseCode: string,
  currentOrderId?: string,
  maxRetries: number = 5
): Promise<string | null> => {
  const currentYear = new Date().getFullYear().toString().slice(-2);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Consultar último correlativo GLOBAL (sin filtrar por año)
      // El correlativo NUNCA se reinicia, aunque cambie el año
      const { data: yearOrders } = await supabase
        .from('tbl_pedidos_rep')
        .select('num_pedido')
        .order('created_at', { ascending: false })
        .limit(200);

      let maxSequential = 999;

      if (yearOrders && yearOrders.length > 0) {
        const sequentials = yearOrders
          .map(order => {
            const parts = order.num_pedido.split('/');
            return parseInt(parts[2] || '0');
          })
          .filter(num => !isNaN(num));

        if (sequentials.length > 0) {
          maxSequential = Math.max(...sequentials);
        }
      }

      const nextSequential = (maxSequential + 1).toString().padStart(4, '0');
      const candidateNumber = `${warehouseCode}/${currentYear}/${nextSequential}`;

      // Verificar disponibilidad
      const exists = await checkOrderNumberExists(candidateNumber, currentOrderId);

      if (!exists) {
        console.log(`✅ Número único generado: ${candidateNumber} (intento ${attempt})`);
        return candidateNumber;
      }

      console.warn(`⚠️ Número ${candidateNumber} ocupado, reintentando...`);
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error);
    }
  }

  console.error('❌ Falló generación tras max intentos');
  return null;
};

export const getOrders = async () => {
  try {
    // Query with join to get supplier name
    const { data: orders, error: ordersError } = await supabase
      .from('tbl_pedidos_rep')
      .select(`
        *,
        tbl_proveedores!inner(nombre),
        tbl_ln_pedidos_rep (*),
        tbl_historico_cambios (*)
      `)
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    if (!orders) return [];

    return orders.map(order => ({
      id: order.id,
      orderNumber: order.num_pedido,
      warehouse: order.alm_envia,
      supplierId: order.proveedor_id,
      supplierName: order.tbl_proveedores.nombre,
      vehicle: order.vehiculo,
      warranty: order.garantia,
      nonConformityReport: order.informacion_nc,
      dismantleDate: order.fecha_desmonte,
      shipmentDate: order.fecha_envio,
      declaredDamage: order.averia_declarada,
      shipmentDocumentation: order.documentacion || [],
      estadoPedido: order.estado_pedido || 'PENDIENTE',
      cancelado: order.cancelado || false,
      orderLines: order.tbl_ln_pedidos_rep.map((line: DbOrderLine) => ({
        id: line.id,
        registration: line.matricula_89 || "",
        partDescription: line.descripcion,
        quantity: line.nenv,
        serialNumber: line.nsenv,
        estadoCompletado: line.estado_completado || false
      })),
      changeHistory: order.tbl_historico_cambios
        .filter((change: any) => change.descripcion_cambio && change.descripcion_cambio.trim())
        .map((change: any) => ({
          id: change.id,
          date: change.created_at,
          user: change.usuario || 'usuario@mat89.com',
          description: change.descripcion_cambio
        }))
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

export const deleteOrder = async (orderId: string) => {
  const { error } = await supabase
    .from('tbl_pedidos_rep')
    .delete()
    .eq('id', orderId);

  if (error) {
    throw error;
  }

  return true;
};

// Nueva función para cancelar (deshabilitar) un pedido
export const cancelOrder = async (orderId: string) => {
  const { error } = await supabase
    .from('tbl_pedidos_rep')
    .update({ cancelado: true })
    .eq('id', orderId);

  if (error) {
    throw error;
  }

  return true;
};

// Nueva función para reactivar un pedido cancelado
export const reactivateOrder = async (orderId: string) => {
  const { error } = await supabase
    .from('tbl_pedidos_rep')
    .update({ cancelado: false })
    .eq('id', orderId);

  if (error) {
    throw error;
  }

  return true;
};

// Nueva función corregida para actualizar estado del pedido
export const updateOrderStatusIfComplete = async (orderId: string): Promise<void> => {
  try {
    console.log(`[DEBUG] Checking completion status for order: ${orderId}`);
    
    // 1. Obtener todas las líneas del pedido con sus recepciones
    const { data: orderLines, error: linesError } = await supabase
      .from('tbl_ln_pedidos_rep')
      .select(`
        id,
        nenv,
        tbl_recepciones (
          n_rec
        )
      `)
      .eq('pedido_id', orderId);

    if (linesError) {
      console.error('Error fetching order lines:', linesError);
      return;
    }

    if (!orderLines || orderLines.length === 0) {
      console.log(`[DEBUG] No lines found for order: ${orderId}`);
      return;
    }

    // 2. Verificar si todas las líneas están completas
    let allLinesComplete = true;
    let totalSent = 0;
    let totalReceived = 0;

    for (const line of orderLines) {
      const lineSent = line.nenv || 0;
      const lineReceived = line.tbl_recepciones?.reduce((sum: number, reception: any) => {
        return sum + (reception.n_rec || 0);
      }, 0) || 0;

      totalSent += lineSent;
      totalReceived += lineReceived;

      console.log(`[DEBUG] Line ${line.id}: Sent=${lineSent}, Received=${lineReceived}`);

      if (lineReceived < lineSent) {
        allLinesComplete = false;
        console.log(`[DEBUG] Line ${line.id} is incomplete: ${lineReceived}/${lineSent}`);
      }
    }

    console.log(`[DEBUG] Order ${orderId} - Total: Sent=${totalSent}, Received=${totalReceived}, AllComplete=${allLinesComplete}`);

    // 3. Determinar el nuevo estado
    const newStatus = allLinesComplete ? 'COMPLETADO' : 'PENDIENTE';

    // 4. Actualizar el estado en la base de datos
    const { error: updateError } = await supabase
      .from('tbl_pedidos_rep')
      .update({ 
        estado_pedido: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order status:', updateError);
      throw updateError;
    }

    console.log(`[DEBUG] Order ${orderId} status updated to: ${newStatus}`);
    
  } catch (error) {
    console.error('Error in updateOrderStatusIfComplete:', error);
  }
};

// Reception functions
export const getOrdersForReception = async (): Promise<Order[]> => {
  try {
    // Get all orders with their lines and recepciones in a single query
    const { data: ordersData, error: ordersError } = await supabase
      .from('tbl_pedidos_rep')
      .select(`
        *,
        tbl_proveedores!inner(nombre),
        tbl_ln_pedidos_rep (
          *,
          tbl_recepciones (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    if (!ordersData) return [];

    return ordersData.map(order => ({
      id: order.id,
      orderNumber: order.num_pedido,
      warehouse: order.alm_envia,
      supplierId: order.proveedor_id,
      supplierName: order.tbl_proveedores.nombre,
      vehicle: order.vehiculo,
      warranty: order.garantia,
      nonConformityReport: order.informacion_nc,
      dismantleDate: order.fecha_desmonte,
      shipmentDate: order.fecha_envio,
      declaredDamage: order.averia_declarada,
      shipmentDocumentation: order.documentacion || [],
      estadoPedido: order.estado_pedido || 'PENDIENTE',
      cancelado: order.cancelado || false,
      changeHistory: [],
      orderLines: order.tbl_ln_pedidos_rep.map((line: DbOrderLine) => {
        // Calculate total received
        const totalReceived = line.tbl_recepciones
          ? line.tbl_recepciones.reduce((total: number, reception: DbReception) => {
              return total + (reception.n_rec || 0);
            }, 0)
          : 0;

        // Get the most recent reception date
        const lastReceptionDate = line.tbl_recepciones && line.tbl_recepciones.length > 0
          ? line.tbl_recepciones
              .map((r: DbReception) => r.fecha_recepcion)
              .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0]
          : undefined;

        return {
          id: line.id,
          registration: line.matricula_89 || "",
          partDescription: line.descripcion,
          quantity: line.nenv,
          serialNumber: line.nsenv,
          estadoCompletado: line.estado_completado || false,
          totalReceived,
          lastReceptionDate,
          receptions: line.tbl_recepciones
            ? line.tbl_recepciones.map((reception: DbReception) => ({
                id: reception.id,
                pedidoId: reception.pedido_id,
                lineaPedidoId: reception.linea_pedido_id,
                fechaRecepcion: reception.fecha_recepcion,
                estadoRecepcion: reception.estado_recepcion,
                nRec: reception.n_rec,
                nsRec: reception.ns_rec || '',
                observaciones: reception.observaciones || '',
                garantiaAceptadaProveedor: reception.garantia_aceptada_proveedor,
                motivoRechazoGarantia: reception.motivo_rechazo_garantia,
                createdAt: reception.created_at,
                updatedAt: reception.updated_at
              }))
            : []
        };
      })
    }));
  } catch (error) {
    console.error('Error fetching orders for reception:', error);
    return [];
  }
};

export const getReceptionsByLineId = async (lineId: string): Promise<MaterialReception[]> => {
  try {
    const { data: receptions, error } = await supabase
      .from('tbl_recepciones')
      .select('*')
      .eq('linea_pedido_id', lineId)
      .order('fecha_recepcion', { ascending: false });

    if (error) throw error;

    return receptions.map(reception => ({
      id: reception.id,
      pedidoId: reception.pedido_id,
      lineaPedidoId: reception.linea_pedido_id,
      fechaRecepcion: reception.fecha_recepcion,
      estadoRecepcion: reception.estado_recepcion,
      nRec: reception.n_rec,
      nsRec: reception.ns_rec || '',
      observaciones: reception.observaciones || '',
      garantiaAceptadaProveedor: reception.garantia_aceptada_proveedor,
      motivoRechazoGarantia: reception.motivo_rechazo_garantia,
      createdAt: reception.created_at,
      updatedAt: reception.updated_at
    }));
  } catch (error) {
    console.error('Error fetching receptions:', error);
    return [];
  }
};

export const saveReception = async (reception: MaterialReception): Promise<any> => {
  const { data, error } = await supabase
    .from('tbl_recepciones')
    .insert({
      id: reception.id,
      pedido_id: reception.pedidoId,
      linea_pedido_id: reception.lineaPedidoId,
      fecha_recepcion: reception.fechaRecepcion,
      estado_recepcion: reception.estadoRecepcion,
      n_rec: reception.nRec,
      ns_rec: reception.nsRec,
      observaciones: reception.observaciones,
      garantia_aceptada_proveedor: reception.garantiaAceptadaProveedor ?? null,
      motivo_rechazo_garantia: reception.motivoRechazoGarantia ?? null
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving reception:', error);
    throw error;
  }

  return data;
};

export const deleteReception = async (receptionId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tbl_recepciones')
    .delete()
    .eq('id', receptionId);

  if (error) {
    console.error('Error deleting reception:', error);
    throw error;
  }

  return true;
};

export const _getReceptions = async (): Promise<Reception[]> => {
  // Query with join to get supplier name
  const { data: orders, error } = await supabase
    .from('tbl_pedidos_rep')
    .select(`
      *,
      tbl_proveedores!inner(nombre),
      tbl_ln_pedidos_rep (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!orders) return [];

  return orders.map(order => ({
    id: order.id,
    orderNumber: order.num_pedido,
    supplier: order.tbl_proveedores.nombre,
    warehouse: order.alm_envia,
    shipmentDate: order.fecha_envio,
    status: order.estado_pedido === 'COMPLETADO' ? 'Completado' : 'Pendiente',
    orderLines: order.tbl_ln_pedidos_rep.map((line: DbOrderLine) => ({
      id: line.id,
      registration: line.matricula_89 || "",
      partDescription: line.descripcion,
      quantity: line.nenv,
      serialNumber: line.nsenv
    }))
  }));
}

// New function for Consulta page data
export const getConsultationData = async (): Promise<ConsultaRecord[]> => {
  try {
    const { data: orders, error } = await supabase
      .from('tbl_pedidos_rep')
      .select(`
        id,
        num_pedido,
        alm_envia,
        vehiculo,
        fecha_envio,
        tbl_proveedores!inner(nombre),
        tbl_ln_pedidos_rep (
          id,
          matricula_89,
          descripcion,
          nenv,
          nsenv,
          tbl_recepciones (
            id,
            fecha_recepcion,
            estado_recepcion,
            n_rec,
            ns_rec,
            observaciones
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const consultationRecords: ConsultaRecord[] = [];
    let lineCounter = 1;

    orders?.forEach(order => {
      order.tbl_ln_pedidos_rep?.forEach(line => {
        if (line.tbl_recepciones && line.tbl_recepciones.length > 0) {
          // Create a record for each reception
          line.tbl_recepciones.forEach(reception => {
            consultationRecords.push({
              linea: lineCounter++,
              almEnvia: order.alm_envia,
              numPedido: order.num_pedido,
              proveedor: (order.tbl_proveedores as unknown as DbSupplier).nombre,
              mat89: line.matricula_89,
              descripcion: line.descripcion || '',
              vehiculo: order.vehiculo,
              fechaEnvio: order.fecha_envio,
              cantEnv: line.nenv,
              numSerieEnv: line.nsenv || '',
              fechaRecepc: reception.fecha_recepcion,
              cantRec: reception.n_rec,
              numSerieRec: reception.ns_rec,
              estadoRecepc: reception.estado_recepcion,
              observaciones: reception.observaciones,
              pedidoId: order.id,
              lineaId: line.id,
              recepcionId: reception.id
            });
          });
        } else {
          // Create a record for line without reception
          consultationRecords.push({
            linea: lineCounter++,
            almEnvia: order.alm_envia,
            numPedido: order.num_pedido,
            proveedor: (order.tbl_proveedores as unknown as DbSupplier).nombre,
            mat89: line.matricula_89,
            descripcion: line.descripcion || '',
            vehiculo: order.vehiculo,
            fechaEnvio: order.fecha_envio,
            cantEnv: line.nenv,
            numSerieEnv: line.nsenv || '',
            fechaRecepc: null,
            cantRec: null,
            numSerieRec: null,
            estadoRecepc: null,
            observaciones: null,
            pedidoId: order.id,
            lineaId: line.id,
            recepcionId: null
          });
        }
      });
    });

    return consultationRecords;
  } catch (error) {
    console.error('Error fetching consultation data:', error);
    return [];
  }
};

// ============================================================================
// APP VERSIONS FUNCTIONS
// ============================================================================

export const getAllVersions = async (): Promise<AppVersion[]> => {
  try {
    const { data, error } = await supabase
      .from('tbl_app_versions')
      .select('*')
      .order('release_date', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      throw error;
    }

    return data.map((version: any) => ({
      id: version.id,
      versionNumber: version.version_number,
      versionName: version.version_name,
      releaseDate: version.release_date,
      changes: version.changes || [],
      createdBy: version.created_by,
      createdAt: version.created_at,
      updatedAt: version.updated_at
    }));
  } catch (error) {
    console.error('Error in getAllVersions:', error);
    return [];
  }
};

export const getVersionById = async (id: string): Promise<AppVersion | null> => {
  try {
    const { data, error } = await supabase
      .from('tbl_app_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching version:', error);
      return null;
    }

    return {
      id: data.id,
      versionNumber: data.version_number,
      versionName: data.version_name,
      releaseDate: data.release_date,
      changes: data.changes || [],
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in getVersionById:', error);
    return null;
  }
};

export const saveVersion = async (version: Partial<AppVersion>): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const versionData = {
      version_number: version.versionNumber,
      version_name: version.versionName,
      release_date: version.releaseDate,
      changes: version.changes,
      created_by: user.id,
      updated_at: new Date().toISOString()
    };

    if (version.id) {
      // Update existing version
      const { error } = await supabase
        .from('tbl_app_versions')
        .update(versionData)
        .eq('id', version.id);

      if (error) {
        console.error('Error updating version:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new version
      const { error } = await supabase
        .from('tbl_app_versions')
        .insert([versionData]);

      if (error) {
        console.error('Error inserting version:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in saveVersion:', error);
    return { success: false, error: error.message };
  }
};

export const deleteVersion = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('tbl_app_versions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting version:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteVersion:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// WARRANTY SYSTEM FUNCTIONS
// ============================================================================

export interface DuplicateMaterialInfo {
  matricula89: string;
  descripcion: string;
  numPedido: string;
  fechaEnvio: string;
  fechaRecepcion: string;
  estadoRecepcion: string;
  pedidoId: string;
}

/**
 * Check for duplicate materials sent to external providers within warranty period (1 year)
 * Used in Phase 2 of warranty detection system
 *
 * @param materials - Array of material registrations (matricula_89) to check
 * @param providerId - External provider ID
 * @param currentOrderId - Current order ID (to exclude from duplicates check)
 * @returns Array of duplicate materials with their previous shipment details
 */
/**
 * @deprecated Use checkWarrantyStatus instead
 */
export const checkDuplicateMaterialsForWarranty = async (
  materials: string[],
  providerId: string,
  currentOrderId?: string
): Promise<DuplicateMaterialInfo[]> => {
  try {
    // Calculate 1 year ago from today
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    // Query for duplicate materials
    // We need to find materials that:
    // 1. Have the same matricula_89
    // 2. Were sent to the same provider
    // 3. Have been received (tbl_recepciones exists)
    // 4. Reception date is within 1 year from today
    const { data, error } = await supabase
      .from('tbl_ln_pedidos_rep')
      .select(`
        matricula_89,
        descripcion,
        pedido_id,
        tbl_pedidos_rep!inner (
          id,
          num_pedido,
          fecha_envio,
          proveedor_id
        ),
        tbl_recepciones!inner (
          fecha_recepcion,
          estado_recepcion,
          id
        )
      `)
      .in('matricula_89', materials)
      .eq('tbl_pedidos_rep.proveedor_id', providerId)
      .gte('tbl_recepciones.fecha_recepcion', oneYearAgoStr);

    if (error) {
      console.error('Error checking duplicate materials:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter out current order if provided and transform data
    const duplicates: DuplicateMaterialInfo[] = [];
    const seenMaterials = new Set<string>();

    for (const item of data) {
      const pedido = Array.isArray(item.tbl_pedidos_rep)
        ? item.tbl_pedidos_rep[0]
        : item.tbl_pedidos_rep;

      const recepcion = Array.isArray(item.tbl_recepciones)
        ? item.tbl_recepciones[0]
        : item.tbl_recepciones;

      // Skip if this is the current order being created/edited
      if (currentOrderId && pedido.id === currentOrderId) {
        continue;
      }

      // Only include each material once (use the most recent reception)
      const materialKey = `${item.matricula_89}-${pedido.id}`;
      if (seenMaterials.has(materialKey)) {
        continue;
      }
      seenMaterials.add(materialKey);

      duplicates.push({
        matricula89: item.matricula_89,
        descripcion: item.descripcion || '',
        numPedido: pedido.num_pedido,
        fechaEnvio: pedido.fecha_envio,
        fechaRecepcion: recepcion.fecha_recepcion,
        estadoRecepcion: recepcion.estado_recepcion,
        pedidoId: pedido.id
      });
    }

    return duplicates;
  } catch (error) {
    console.error('Error in checkDuplicateMaterialsForWarranty:', error);
    return [];
  }
};

/**
 * Check warranty status for materials - NEW IMPLEMENTATION
 *
 * This function checks ALL previous warranty shipments for materials to:
 * 1. Block sending if there's a pending reception (GLOBAL blocking across all warehouses)
 * 2. Block sending if last reception was marked IRREPARABLE
 * 3. Show complete history of previous warranty shipments
 *
 * @param materials - Array of material registrations (matricula_89) to check
 * @param providerId - External provider ID
 * @param currentOrderId - Current order ID (to exclude from check)
 * @returns Array of warranty history info per material
 */
export const checkWarrantyStatus = async (
  materials: number[],
  providerId: string,
  currentOrderId?: string
): Promise<WarrantyHistoryInfo[]> => {
  try {
    // Query ALL previous warranty shipments (not just within 1 year)
    const { data, error } = await supabase
      .from('tbl_ln_pedidos_rep')
      .select(`
        matricula_89,
        pedido_id,
        tbl_pedidos_rep!inner (
          id_pedido,
          num_pedido,
          alm_envia,
          created_at,
          proveedor_id,
          garantia
        )
      `)
      .in('matricula_89', materials)
      .eq('tbl_pedidos_rep.proveedor_id', providerId)
      .eq('tbl_pedidos_rep.garantia', true) // Only warranty orders
      .order('created_at', { foreignTable: 'tbl_pedidos_rep', ascending: false });

    if (error) {
      console.error('Error checking warranty status:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get reception data for all orders found
    const orderIds = [...new Set(data.map(item => {
      const pedido = Array.isArray(item.tbl_pedidos_rep) ? item.tbl_pedidos_rep[0] : item.tbl_pedidos_rep;
      return pedido.id_pedido;
    }))].filter(id => id !== currentOrderId);

    const { data: receptionsData, error: receptionsError } = await supabase
      .from('tbl_recepciones')
      .select('pedido_id, fecha_recepcion, garantia_aceptada_proveedor, motivo_rechazo_garantia, estado_recepcion')
      .in('pedido_id', orderIds);

    if (receptionsError) {
      console.error('Error fetching receptions:', receptionsError);
    }

    // Build reception map
    const receptionsMap = new Map<string, any>();
    if (receptionsData) {
      for (const rec of receptionsData) {
        if (!receptionsMap.has(rec.pedido_id)) {
          receptionsMap.set(rec.pedido_id, rec);
        }
      }
    }

    // Group by material
    const materialGroups = new Map<number, any[]>();
    for (const item of data) {
      const pedido = Array.isArray(item.tbl_pedidos_rep) ? item.tbl_pedidos_rep[0] : item.tbl_pedidos_rep;

      // Skip current order
      if (currentOrderId && pedido.id_pedido === currentOrderId) {
        continue;
      }

      if (!materialGroups.has(item.matricula_89)) {
        materialGroups.set(item.matricula_89, []);
      }
      materialGroups.get(item.matricula_89)!.push({ ...item, pedido });
    }

    // Build warranty history info for each material
    const result: WarrantyHistoryInfo[] = [];

    for (const [materialReg, items] of materialGroups) {
      const previousOrders: WarrantyPreviousOrder[] = [];
      let canSend = true;
      let blockingReason: string | null = null;

      for (const item of items) {
        const reception = receptionsMap.get(item.pedido.id_pedido);
        const isPending = !reception;
        const isIrreparable = reception?.estado_recepcion === 'IRREPARABLE';

        previousOrders.push({
          orderNumber: item.pedido.num_pedido,
          warehouse: item.pedido.alm_envia,
          sendDate: item.pedido.created_at,
          receptionDate: reception?.fecha_recepcion || null,
          warrantyAccepted: reception?.garantia_aceptada_proveedor ?? null,
          rejectionReason: reception?.motivo_rechazo_garantia || null,
          isIrreparable,
          isPendingReception: isPending
        });

        // BLOCKING LOGIC
        // 1. If ANY order is pending reception -> BLOCK
        if (isPending) {
          canSend = false;
          blockingReason = `Material pendiente de recepción del pedido ${item.pedido.num_pedido}`;
        }

        // 2. If ANY reception is IRREPARABLE -> BLOCK
        if (isIrreparable && canSend) {
          canSend = false;
          blockingReason = `Material marcado como IRREPARABLE en pedido ${item.pedido.num_pedido}`;
        }
      }

      result.push({
        materialRegistration: materialReg,
        previousOrders,
        canSendWithWarranty: canSend,
        blockingReason
      });
    }

    return result;
  } catch (error) {
    console.error('Error in checkWarrantyStatus:', error);
    return [];
  }
};

// ============================================================================
// TIPOS DE REVISIÓN FUNCTIONS
// ============================================================================

/**
 * Obtiene todos los tipos de revisión activos (ordenados alfabéticamente)
 */
export const getTiposRevision = async (): Promise<TipoRevision[]> => {
  try {
    const { data, error } = await supabase
      .from('tbl_tipos_revision')
      .select('*')
      .eq('activo', true)
      .order('codigo', { ascending: true });

    if (error) {
      console.error('Error fetching tipos revision:', error);
      return [];
    }

    return (data || []).map(tipo => ({
      id: tipo.id,
      codigo: tipo.codigo,
      descripcion: tipo.descripcion,
      esPredeterminado: tipo.es_predeterminado,
      activo: tipo.activo,
      createdAt: tipo.created_at,
      updatedAt: tipo.updated_at
    }));
  } catch (err) {
    console.error('Error in getTiposRevision:', err);
    return [];
  }
};

/**
 * Crea un nuevo tipo de revisión personalizado
 */
export const createTipoRevision = async (
  codigo: string,
  descripcion: string
): Promise<TipoRevision> => {
  try {
    // Validaciones
    const codigoUpper = codigo.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(codigoUpper)) {
      throw new Error('El código debe ser alfanumérico sin espacios');
    }

    const { data, error } = await supabase
      .from('tbl_tipos_revision')
      .insert({
        codigo: codigoUpper,
        descripcion: descripcion.trim(),
        es_predeterminado: false
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('El código ya existe');
      }
      throw error;
    }

    return {
      id: data.id,
      codigo: data.codigo,
      descripcion: data.descripcion,
      esPredeterminado: data.es_predeterminado,
      activo: data.activo,
      createdAt: data.created_at
    };
  } catch (err) {
    console.error('Error in createTipoRevision:', err);
    throw err;
  }
};

/**
 * Actualiza un tipo de revisión personalizado (solo código y descripción)
 */
export const updateTipoRevision = async (
  id: string,
  codigo: string,
  descripcion: string
): Promise<void> => {
  try {
    const codigoUpper = codigo.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(codigoUpper)) {
      throw new Error('El código debe ser alfanumérico sin espacios');
    }

    const { error } = await supabase
      .from('tbl_tipos_revision')
      .update({
        codigo: codigoUpper,
        descripcion: descripcion.trim()
      })
      .eq('id', id)
      .eq('es_predeterminado', false);

    if (error) {
      if (error.code === '23505') {
        throw new Error('El código ya existe');
      }
      throw error;
    }
  } catch (err) {
    console.error('Error in updateTipoRevision:', err);
    throw err;
  }
};

/**
 * Elimina un tipo de revisión (solo si no está en uso)
 */
export const deleteTipoRevision = async (id: string): Promise<void> => {
  try {
    // Verificar si está en uso
    const { data: usos, error: checkError } = await supabase
      .from('tbl_plantillas_materiales')
      .select(`
        id,
        tbl_plantillas!inner(nombre, serie_vehiculo)
      `)
      .eq('tipo_revision_id', id);

    if (checkError) throw checkError;

    if (usos && usos.length > 0) {
      const plantillasAfectadas = usos.map((u: any) =>
        `${u.tbl_plantillas.nombre} - Serie ${u.tbl_plantillas.serie_vehiculo}`
      );
      const uniquePlantillas = [...new Set(plantillasAfectadas)];
      throw new Error(
        `No se puede eliminar. Tipo usado en ${uniquePlantillas.length} plantilla(s):\n${uniquePlantillas.join('\n')}`
      );
    }

    // Eliminar
    const { error } = await supabase
      .from('tbl_tipos_revision')
      .delete()
      .eq('id', id)
      .eq('es_predeterminado', false);

    if (error) throw error;
  } catch (err) {
    console.error('Error in deleteTipoRevision:', err);
    throw err;
  }
};

// ============================================================================
// PLANTILLAS FUNCTIONS
// ============================================================================

/**
 * Obtiene TODAS las plantillas (para ADMINISTRADOR)
 */
export const getAllPlantillas = async (): Promise<PlantillaWithMaterials[]> => {
  try {
    const { data: plantillas, error } = await supabase
      .from('tbl_plantillas')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error fetching plantillas:', error);
      return [];
    }

    if (!plantillas || plantillas.length === 0) return [];

    // Obtener nombres de usuarios creadores
    const userIds = [...new Set(plantillas.map((p: any) => p.usuario_creador_id))];
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('user_id, nombre_usuario')
      .in('user_id', userIds);

    const userMap = new Map(
      (userProfiles || []).map((up: any) => [up.user_id, up.nombre_usuario])
    );

    // Fetch materiales para cada plantilla
    const plantillasWithMaterials = await Promise.all(
      plantillas.map(async (plantilla: any) => {
        const { data: materiales, error: matError } = await supabase
          .from('tbl_plantillas_materiales')
          .select(`
            *,
            tbl_materiales(matricula_89, descripcion, serie_vehiculo),
            tbl_tipos_revision(codigo)
          `)
          .eq('plantilla_id', plantilla.id);

        if (matError) {
          console.error('Error fetching materials:', matError);
          return {
            id: plantilla.id,
            nombre: plantilla.nombre,
            serieVehiculo: plantilla.serie_vehiculo,
            usuarioCreadorId: plantilla.usuario_creador_id,
            usuarioCreadorNombre: userMap.get(plantilla.usuario_creador_id),
            fechaCreacion: plantilla.fecha_creacion,
            createdAt: plantilla.created_at,
            updatedAt: plantilla.updated_at,
            materiales: [],
            totalMateriales: 0
          };
        }

        const materialesMapped = (materiales || []).map((m: any) => ({
          id: m.id,
          plantillaId: m.plantilla_id,
          materialId: m.material_id,
          cantidad: m.cantidad,
          tipoRevisionId: m.tipo_revision_id,
          tipoRevisionCodigo: m.tbl_tipos_revision?.codigo,
          matricula: m.tbl_materiales?.matricula_89,
          descripcion: m.tbl_materiales?.descripcion,
          serieVehiculo: m.tbl_materiales?.serie_vehiculo,
          createdAt: m.created_at
        }));

        return {
          id: plantilla.id,
          nombre: plantilla.nombre,
          serieVehiculo: plantilla.serie_vehiculo,
          usuarioCreadorId: plantilla.usuario_creador_id,
          usuarioCreadorNombre: userMap.get(plantilla.usuario_creador_id),
          fechaCreacion: plantilla.fecha_creacion,
          createdAt: plantilla.created_at,
          updatedAt: plantilla.updated_at,
          materiales: materialesMapped,
          totalMateriales: materialesMapped.length
        };
      })
    );

    return plantillasWithMaterials;
  } catch (err) {
    console.error('Error in getAllPlantillas:', err);
    return [];
  }
};

/**
 * Obtiene historial de una plantilla
 */
export const getPlantillaHistorial = async (
  plantillaId: string
): Promise<PlantillaHistorial[]> => {
  try {
    const { data, error } = await supabase
      .from('tbl_plantillas_historial')
      .select(`
        *,
        user_profiles(nombre_usuario)
      `)
      .eq('plantilla_id', plantillaId)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error fetching historial:', error);
      return [];
    }

    return (data || []).map((h: any) => ({
      id: h.id,
      plantillaId: h.plantilla_id,
      usuarioId: h.usuario_id,
      accion: h.accion,
      fecha: h.fecha,
      usuarioNombre: h.user_profiles?.nombre_usuario,
      createdAt: h.created_at
    }));
  } catch (err) {
    console.error('Error in getPlantillaHistorial:', err);
    return [];
  }
};

/**
 * Registra acción en historial
 */
const registrarHistorial = async (
  plantillaId: string,
  accion: string
): Promise<void> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    await supabase.from('tbl_plantillas_historial').insert({
      plantilla_id: plantillaId,
      usuario_id: userData.user.id,
      accion
    });
  } catch (err) {
    console.error('Error registering historial:', err);
  }
};

/**
 * Crea una nueva plantilla
 */
export const createPlantilla = async (
  nombre: string,
  serieVehiculo: string,
  materialesSeleccionados: Array<{
    materialId: string;
    cantidad: number;
    tipoRevisionId: string;
  }>
): Promise<Plantilla> => {
  try {
    // Validations
    if (!nombre || nombre.trim().length === 0) {
      throw new Error('El nombre de la plantilla no puede estar vacío');
    }

    if (!serieVehiculo) {
      throw new Error('Debe seleccionar una serie de vehículo');
    }

    if (!materialesSeleccionados || materialesSeleccionados.length === 0) {
      throw new Error('Debe seleccionar al menos un material');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuario no autenticado');
    }

    // Create plantilla
    const { data: plantilla, error: plantillaError } = await supabase
      .from('tbl_plantillas')
      .insert({
        nombre: nombre.trim(),
        serie_vehiculo: serieVehiculo,
        usuario_creador_id: userData.user.id
      })
      .select()
      .single();

    if (plantillaError) {
      console.error('Error creating plantilla:', plantillaError);
      throw plantillaError;
    }

    // Insert materials
    const materialesInsert = materialesSeleccionados.map((m) => ({
      plantilla_id: plantilla.id,
      material_id: m.materialId,
      cantidad: m.cantidad,
      tipo_revision_id: m.tipoRevisionId
    }));

    const { error: materialesError } = await supabase
      .from('tbl_plantillas_materiales')
      .insert(materialesInsert);

    if (materialesError) {
      // Rollback
      await supabase.from('tbl_plantillas').delete().eq('id', plantilla.id);
      throw materialesError;
    }

    // Registrar en historial
    await registrarHistorial(plantilla.id, 'Plantilla creada');

    return {
      id: plantilla.id,
      nombre: plantilla.nombre,
      serieVehiculo: plantilla.serie_vehiculo,
      usuarioCreadorId: plantilla.usuario_creador_id,
      fechaCreacion: plantilla.fecha_creacion,
      createdAt: plantilla.created_at
    };
  } catch (err) {
    console.error('Error in createPlantilla:', err);
    throw err;
  }
};

/**
 * Actualiza el nombre de una plantilla (solo creador)
 */
export const updatePlantillaNombre = async (
  plantillaId: string,
  nuevoNombre: string
): Promise<void> => {
  try {
    if (!nuevoNombre || nuevoNombre.trim().length === 0) {
      throw new Error('El nombre no puede estar vacío');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar que es el creador
    const { data: plantilla } = await supabase
      .from('tbl_plantillas')
      .select('usuario_creador_id, nombre')
      .eq('id', plantillaId)
      .single();

    if (!plantilla || plantilla.usuario_creador_id !== userData.user.id) {
      throw new Error('Solo el creador puede editar el nombre');
    }

    const { error } = await supabase
      .from('tbl_plantillas')
      .update({
        nombre: nuevoNombre.trim(),
        updated_by: userData.user.id
      })
      .eq('id', plantillaId);

    if (error) throw error;

    // Registrar en historial
    await registrarHistorial(
      plantillaId,
      `Nombre cambiado de "${plantilla.nombre}" a "${nuevoNombre}"`
    );
  } catch (err) {
    console.error('Error in updatePlantillaNombre:', err);
    throw err;
  }
};

/**
 * Actualiza materiales de una plantilla (reemplaza completamente)
 */
export const updatePlantillaMateriales = async (
  plantillaId: string,
  nuevosMateriales: Array<{
    materialId: string;
    cantidad: number;
    tipoRevisionId: string;
  }>
): Promise<void> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuario no autenticado');
    }

    // Delete existing materials
    const { error: deleteError } = await supabase
      .from('tbl_plantillas_materiales')
      .delete()
      .eq('plantilla_id', plantillaId);

    if (deleteError) throw deleteError;

    // Insert new materials
    if (nuevosMateriales.length > 0) {
      const materialesInsert = nuevosMateriales.map((m) => ({
        plantilla_id: plantillaId,
        material_id: m.materialId,
        cantidad: m.cantidad,
        tipo_revision_id: m.tipoRevisionId
      }));

      const { error: insertError } = await supabase
        .from('tbl_plantillas_materiales')
        .insert(materialesInsert);

      if (insertError) throw insertError;
    }

    // Update updated_by
    await supabase
      .from('tbl_plantillas')
      .update({ updated_by: userData.user.id })
      .eq('id', plantillaId);

    // Registrar en historial
    await registrarHistorial(
      plantillaId,
      `Materiales actualizados (${nuevosMateriales.length} materiales)`
    );
  } catch (err) {
    console.error('Error in updatePlantillaMateriales:', err);
    throw err;
  }
};

/**
 * Actualiza tipo de revisión de un material específico
 */
export const updateMaterialTipoRevision = async (
  materialPlantillaId: string,
  tipoRevisionId: string
): Promise<void> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await supabase
      .from('tbl_plantillas_materiales')
      .update({ tipo_revision_id: tipoRevisionId })
      .eq('id', materialPlantillaId);

    if (error) throw error;

    // Update updated_by en plantilla
    const { data: material } = await supabase
      .from('tbl_plantillas_materiales')
      .select('plantilla_id')
      .eq('id', materialPlantillaId)
      .single();

    if (material) {
      await supabase
        .from('tbl_plantillas')
        .update({ updated_by: userData.user.id })
        .eq('id', material.plantilla_id);
    }
  } catch (err) {
    console.error('Error in updateMaterialTipoRevision:', err);
    throw err;
  }
};

/**
 * Elimina un material de una plantilla
 */
export const deletePlantillaMaterial = async (
  materialPlantillaId: string
): Promise<void> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuario no autenticado');
    }

    // Get material info for historial
    const { data: material } = await supabase
      .from('tbl_plantillas_materiales')
      .select(`
        plantilla_id,
        tbl_materiales(descripcion)
      `)
      .eq('id', materialPlantillaId)
      .single();

    const { error } = await supabase
      .from('tbl_plantillas_materiales')
      .delete()
      .eq('id', materialPlantillaId);

    if (error) throw error;

    // Registrar en historial
    if (material) {
      const descripcionMaterial = Array.isArray(material.tbl_materiales)
        ? material.tbl_materiales[0]?.descripcion
        : (material.tbl_materiales as any)?.descripcion;
      await registrarHistorial(
        material.plantilla_id,
        `Material eliminado: ${descripcionMaterial || 'Sin descripción'}`
      );

      // Update updated_by
      await supabase
        .from('tbl_plantillas')
        .update({ updated_by: userData.user.id })
        .eq('id', material.plantilla_id);
    }
  } catch (err) {
    console.error('Error in deletePlantillaMaterial:', err);
    throw err;
  }
};

/**
 * Elimina una plantilla completa (solo creador)
 */
export const deletePlantilla = async (plantillaId: string): Promise<void> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar que es el creador
    const { data: plantilla } = await supabase
      .from('tbl_plantillas')
      .select('usuario_creador_id')
      .eq('id', plantillaId)
      .single();

    if (!plantilla || plantilla.usuario_creador_id !== userData.user.id) {
      throw new Error('Solo el creador puede eliminar la plantilla');
    }

    const { error } = await supabase
      .from('tbl_plantillas')
      .delete()
      .eq('id', plantillaId);

    if (error) throw error;
  } catch (err) {
    console.error('Error in deletePlantilla:', err);
    throw err;
  }
};

/**
 * Duplica una plantilla
 */
export const duplicarPlantilla = async (
  plantillaOriginalId: string,
  nuevoNombre: string
): Promise<Plantilla> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuario no autenticado');
    }

    // Get original plantilla
    const { data: original, error: getError } = await supabase
      .from('tbl_plantillas')
      .select('*, tbl_plantillas_materiales(*)')
      .eq('id', plantillaOriginalId)
      .single();

    if (getError || !original) {
      throw new Error('Plantilla no encontrada');
    }

    // Create new plantilla
    const { data: nuevaPlantilla, error: createError } = await supabase
      .from('tbl_plantillas')
      .insert({
        nombre: nuevoNombre.trim(),
        serie_vehiculo: original.serie_vehiculo,
        usuario_creador_id: userData.user.id
      })
      .select()
      .single();

    if (createError) throw createError;

    // Copy materials
    if (original.tbl_plantillas_materiales && original.tbl_plantillas_materiales.length > 0) {
      const materialesCopy = original.tbl_plantillas_materiales.map((m: any) => ({
        plantilla_id: nuevaPlantilla.id,
        material_id: m.material_id,
        cantidad: m.cantidad,
        tipo_revision_id: m.tipo_revision_id
      }));

      const { error: matError } = await supabase
        .from('tbl_plantillas_materiales')
        .insert(materialesCopy);

      if (matError) {
        // Rollback
        await supabase.from('tbl_plantillas').delete().eq('id', nuevaPlantilla.id);
        throw matError;
      }
    }

    // Registrar en historial
    await registrarHistorial(
      nuevaPlantilla.id,
      `Plantilla duplicada de "${original.nombre}"`
    );

    return {
      id: nuevaPlantilla.id,
      nombre: nuevaPlantilla.nombre,
      serieVehiculo: nuevaPlantilla.serie_vehiculo,
      usuarioCreadorId: nuevaPlantilla.usuario_creador_id,
      fechaCreacion: nuevaPlantilla.fecha_creacion,
      createdAt: nuevaPlantilla.created_at
    };
  } catch (err) {
    console.error('Error in duplicarPlantilla:', err);
    throw err;
  }
};