export interface Reception {
  id: string;
  orderNumber: string;
  supplier: string;
  warehouse: string;
  shipmentDate: string;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
  orderLines: OrderLine[];
}

export interface MaterialReception {
  id: string;
  pedidoId: string;
  lineaPedidoId: string;
  fechaRecepcion: string;
  estadoRecepcion: 'UTIL' | 'IRREPARABLE' | 'SIN ACTUACION' | 'OTROS';
  nRec: number;
  nsRec: string;
  observaciones: string;
  garantiaAceptadaProveedor?: boolean | null;
  motivoRechazoGarantia?: string | null;
  almRecepciona?: string; // NUEVO: Almacén que recepciona el material
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  warehouse: string;
  supplierId: string;
  supplierName: string;
  vehicle: string;
  warranty: boolean;
  nonConformityReport: string;
  dismantleDate: string;
  shipmentDate: string;
  declaredDamage: string;
  shipmentDocumentation: string[];
  changeHistory: ChangeHistoryItem[];
  orderLines: OrderLine[];
  estadoPedido?: 'PENDIENTE' | 'COMPLETADO';
  deleted?: boolean;
  cancelado?: boolean;
  enviadoSinGarantia?: boolean;
}

export interface OrderLine {
  id: string;
  registration: string;
  partDescription: string;
  quantity: number;
  serialNumber: string;
  estadoCompletado?: boolean;
  totalReceived?: number;
  lastReceptionDate?: string;
  receptions?: MaterialReception[];
}

interface ChangeHistoryItem {
  id: string;
  date: string;
  user: string;
  description: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
}

export interface Vehiculo {
  id: string;
  codigo_vehiculo: string;
  nombre_vehiculo: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  isExternal?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Material {
  id: string;
  registration: number; // matricula_89
  description: string;
  vehicleSeries?: string;
  infoAdicional?: string; // Nuevo campo editable
  // Campos opcionales para referencia a proveedor (sin relación FK)
  supplierId?: string; // Campo opcional de texto, sin constraint
  supplierName?: string; // Campo calculado en frontend si es necesario
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string; // Email del usuario que hizo la última actualización
  // Campos para mostrar último proveedor de envío
  lastSupplierName?: string;
  lastSupplierDate?: string;
}

// New interface for the Consulta page data structure
export interface ConsultaRecord {
  linea: number;
  almEnvia: string;
  numPedido: string;
  proveedor: string;
  mat89: string;
  descripcion: string;
  vehiculo: string;
  fechaEnvio: string;
  cantEnv: number;
  numSerieEnv: string;
  fechaRecepc: string | null;
  cantRec: number | null;
  numSerieRec: string | null;
  estadoRecepc: string | null;
  observaciones: string | null;
  // Internal IDs for tracking
  pedidoId: string;
  lineaId: string;
  recepcionId: string | null;
}

export interface AppVersion {
  id: string;
  versionNumber: string;
  versionName: string;
  releaseDate: string;
  changes: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// WARRANTY HISTORY INTERFACES
// ============================================================

export interface WarrantyPreviousOrder {
  orderNumber: string;
  warehouse: string;
  sendDate: string;
  receptionDate: string | null;
  warrantyAccepted: boolean | null;
  rejectionReason: string | null;
  isIrreparable: boolean;
  isPendingReception: boolean;
}

export interface WarrantyHistoryInfo {
  materialRegistration: number;
  previousOrders: WarrantyPreviousOrder[];
  canSendWithWarranty: boolean;
  blockingReason: string | null;
}

// ============================================================
// TEMPLATE MASTER INTERFACES
// ============================================================

export interface TipoRevision {
  id: string;
  codigo: string;
  descripcion: string;
  esPredeterminado: boolean;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlantillaMaterial {
  id: string;
  plantillaId: string;
  materialId: string;
  cantidad: number;
  tipoRevisionId: string;
  createdAt?: string;
  // Campos calculados del material
  matricula?: number;
  descripcion?: string;
  serieVehiculo?: string;
  // Campo calculado del tipo
  tipoRevisionCodigo?: string;
}

export interface PlantillaHistorial {
  id: string;
  plantillaId: string;
  usuarioId: string;
  accion: string;
  fecha: string;
  createdAt?: string;
  // Campos calculados
  usuarioNombre?: string;
}

export interface Plantilla {
  id: string;
  nombre: string;
  serieVehiculo: string;
  usuarioCreadorId: string;
  fechaCreacion: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  // Campos calculados
  usuarioCreadorNombre?: string;
  totalMateriales?: number;
}

export interface PlantillaWithMaterials extends Plantilla {
  materiales: PlantillaMaterial[];
}

export interface PlantillaComplete extends PlantillaWithMaterials {
  historial: PlantillaHistorial[];
}