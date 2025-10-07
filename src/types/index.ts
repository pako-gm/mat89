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
}

export interface OrderLine {
  id: string;
  registration: string;
  partDescription: string;
  quantity: number;
  serialNumber: string;
  estadoCompletado?: boolean;
  totalReceived?: number;
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