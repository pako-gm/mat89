import { Order, Warehouse, Supplier, Reception } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { supabase } from './supabase';

export const warehouses: Warehouse[] = [
  { id: "1", code: "ALM141", name: "Almacén 141" },
  { id: "2", code: "ALM140", name: "Almacén 140" },
  { id: "3", code: "ALM148", name: "Almacén 148" },
];

export const getSuppliers = async () => {
  const { data: suppliers, error } = await supabase
    .from('tbl_proveedores')
    .select('id, nombre')
    .order('nombre');

  if (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }

  return suppliers.map(supplier => ({
    id: supplier.id,
    name: supplier.nombre
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

export const getSupplierById = async (id: string) => {
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

// Empty the sample orders array
export const sampleOrders: Order[] = [];

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

    // Save order lines
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

    // Save change history
    if (order.changeHistory.length > 0) {
      const { error: historyError } = await supabase
        .from('tbl_historico_cambios')
        .insert(
          order.changeHistory.map(change => ({
            pedido_id: order.id,
            descripcion_cambio: change.description,
            usuario: userData.user?.email || 'SISTEMA'
          }))
        );

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
      orderLines: order.tbl_ln_pedidos_rep.map(line => ({
        id: line.id,
        registration: line.matricula_89 || "",
        partDescription: line.descripcion,
        quantity: line.nenv,
        serialNumber: line.nsenv
      })),
      changeHistory: order.tbl_historico_cambios.map(change => ({
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

export const getReceptions = async (): Promise<Reception[]> => {
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
    status: 'Pendiente',
    orderLines: order.tbl_ln_pedidos_rep.map(line => ({
      id: line.id,
      registration: line.matricula_89 || "",
      partDescription: line.descripcion,
      quantity: line.nenv,
      serialNumber: line.nsenv
    }))
  }));
}