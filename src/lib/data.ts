import { Order, Warehouse, Supplier, Reception, Material, MaterialReception, ConsultaRecord, AppVersion } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { supabase } from './supabase';

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
  fecha_recepcion: string;
  estado_recepcion: string;
  n_rec: number;
  ns_rec: string;
  observaciones: string;
}

interface DbSupplier {
  nombre: string;
}

export const warehouses: Warehouse[] = [
  { id: "1", code: "ALM141", name: "Almacén 141" },
  { id: "2", code: "ALM140", name: "Almacén 140" },
  { id: "3", code: "ALM148", name: "Almacén 148" },
];

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
    .order('matricula_89', { ascending: true });

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
  
  try {
    const { data: savedOrder, error: orderError } = await supabase
      .from('tbl_pedidos_rep')
      .upsert({
        id: order.id,
        num_pedido: order.orderNumber,
        alm_envia: order.warehouse,
        proveedor_id: order.supplierId,
        vehiculo: order.vehicle,
        garantia: order.warranty,
        informacion_nc: order.nonConformityReport,
        fecha_desmonte: order.dismantleDate,
        fecha_envio: order.shipmentDate,
        averia_declarada: order.declaredDamage,
        documentacion: order.shipmentDocumentation,
        user_id: userId // Use explicit user ID 
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error saving order:", orderError);
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
    
    return savedOrder;
  } catch (error) {
    console.error("Error in saveOrder:", error);
    throw error;
  }
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
          tbl_recepciones (
            n_rec
          )
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
      orderLines: order.tbl_ln_pedidos_rep.map((line: DbOrderLine) => ({
        id: line.id,
        registration: line.matricula_89 || "",
        partDescription: line.descripcion,
        quantity: line.nenv,
        serialNumber: line.nsenv,
        estadoCompletado: line.estado_completado || false,
        totalReceived: line.tbl_recepciones
          ? line.tbl_recepciones.reduce((total: number, reception: DbReception) => {
              return total + (reception.n_rec || 0);
            }, 0)
          : 0
      }))
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
      observaciones: reception.observaciones
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