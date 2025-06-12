export interface Reception {
  id: string;
  orderNumber: string;
  supplier: string;
  warehouse: string;
  shipmentDate: string;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
  orderLines: OrderLine[];
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
  deleted?: boolean;
}

export interface OrderLine {
  id: string;
  registration: string;
  partDescription: string;
  quantity: number;
  serialNumber: string;
}

export interface ChangeHistoryItem {
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
  supplierId?: string;
  supplierName?: string;
  createdAt?: string;
  updatedAt?: string;
}