# Documentación del Componente OrderList

## Descripción General

El componente `OrderList` es una funcionalidad completa de gestión de pedidos que permite visualizar, crear, editar, eliminar y generar documentos PAR (Petición de Autorización de Reparación) para pedidos de repuestos. Está diseñado específicamente para un sistema de gestión de almacenes ferroviarios.

## Características Principales

### 1. Gestión de Pedidos
- **Visualización de pedidos**: Lista paginada con información clave de cada pedido
- **Búsqueda y filtrado**: Búsqueda por número de pedido, proveedor o vehículo
- **Creación de nuevos pedidos**: Generación automática de números de pedido
- **Edición de pedidos existentes**: Modificación completa de datos
- **Eliminación de pedidos**: Con confirmación de seguridad

### 2. Numeración Automática de Pedidos
El sistema genera automáticamente números de pedido con el formato: `{almacén}/{año}/{secuencial}`

**Ejemplo**: `01/24/1000`
- `01`: Código del almacén (extraído de ALM01)
- `24`: Año actual (últimos 2 dígitos)
- `1000`: Número secuencial (comienza en 1000)

### 3. Generación de Documentos PAR
Sistema inteligente que diferencia entre proveedores internos y externos:

#### Para Proveedores Externos
- Genera documento HTML con formato A4 vertical
- Incluye logo de RENFE
- Diseño minimalista y profesional
- Modal de vista previa e impresión

#### Para Proveedores Internos
- Genera archivo Excel específico
- Descarga automática mediante `file-saver`

### 4. Paginación y Navegación
- **Paginación**: 10 pedidos por página
- **Navegación**: Botones de primera, anterior, siguiente y última página
- **Búsqueda en tiempo real**: Filtrado dinámico de resultados

## Estructura de Datos

### Interfaz Order
```typescript
interface Order {
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
  shipmentDocumentation: any[];
  changeHistory: any[];
  orderLines: OrderLine[];
}
```

### Interfaz OrderLine
```typescript
interface OrderLine {
  id: string;
  registration: string;
  partDescription: string;
  quantity: number;
  serialNumber: string;
}
```

## Estados del Componente

### Estados Principales
- `orders`: Array de todos los pedidos
- `filteredOrders`: Array de pedidos filtrados por búsqueda
- `selectedOrder`: Pedido seleccionado para edición/visualización
- `isEditing`: Booleano que indica si está en modo edición

### Estados de Modal y UI
- `showForm`: Muestra/oculta el formulario de pedidos
- `showDeleteConfirmation`: Confirmación de eliminación
- `showLanzarParModal`: Modal para generar PAR
- `showPrintModal`: Modal de vista previa de documentos

### Estados de Búsqueda y Paginación
- `searchQuery`: Término de búsqueda actual
- `currentPage`: Página actual de la paginación
- `ordersPerPage`: Número de pedidos por página (constante: 10)

## Funciones Principales

### 1. Gestión de Datos
```javascript
const fetchOrders = async () => {
  // Carga pedidos desde la base de datos
  // Ordena por número secuencial descendente
}

const generateNextOrderNumber = () => {
  // Genera el siguiente número de pedido automáticamente
}

const createEmptyOrder = (): Order => {
  // Crea un pedido vacío con estructura inicial
}
```

### 2. Operaciones CRUD
```javascript
const handleNewOrder = () => {
  // Inicia la creación de un nuevo pedido
}

const handleSaveOrder = async () => {
  // Guarda cambios y actualiza la lista
}

const handleDeleteOrder = async () => {
  // Elimina pedido con confirmación
}
```

### 3. Búsqueda y Filtrado
```javascript
const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Filtra pedidos por número, proveedor o vehículo
}

const clearFilter = () => {
  // Limpia filtros y restaura la lista completa
}
```

### 4. Generación de PAR
```javascript
const handleLanzarPAR = () => {
  // Inicia el proceso de generación de PAR
}

const findOrderByLastDigits = async (lastDigits: string) => {
  // Busca pedido por las 4 últimas cifras
}

const procesarProveedorExterno = async (numeroPedido: string) => {
  // Genera documento HTML para proveedores externos
}

const procesarProveedorInterno = async (numeroPedido: string) => {
  // Genera archivo Excel para proveedores internos
}
```

## Componentes UI Utilizados

### Componentes de shadcn/ui
- `Button`: Botones de acción
- `Table`: Tabla de pedidos
- `Input`: Campos de búsqueda
- `AlertDialog`: Confirmaciones de eliminación
- `Dialog`: Modales generales

### Iconos de Lucide React
- `Plus`: Nuevo pedido
- `Search`: Búsqueda
- `Trash2`: Eliminar
- `Star`: Destacar
- `ChevronLeft/Right`: Navegación
- `ChevronsLeft/Right`: Primera/Última página

## Integración con Base de Datos

### Tablas Supabase
- `tbl_pedidos_rep`: Tabla principal de pedidos
- `tbl_proveedores`: Información de proveedores
- `tbl_ln_pedidos_rep`: Líneas de pedido

### Consultas Principales
```sql
-- Búsqueda por últimas 4 cifras
SELECT id, num_pedido, proveedor_id 
FROM tbl_pedidos_rep 
WHERE num_pedido ILIKE '%{lastDigits}'

-- Información del proveedor
SELECT id, nombre, es_externo, direccion, ciudad, provincia, codigo_postal, email
FROM tbl_proveedores 
WHERE id = {supplierId}
```

## Manejo de Errores

### Toast Notifications
- Éxito en operaciones CRUD
- Errores de conexión a base de datos
- Validaciones de formulario
- Confirmaciones de acciones

### Validaciones
- Campo requerido en generación de PAR
- Formato exacto de 4 dígitos
- Verificación de existencia de pedidos
- Control de pedidos duplicados

## Paginación

### Configuración
- **Pedidos por página**: 10
- **Navegación completa**: Primera, anterior, siguiente, última
- **Información de página**: "Página X de Y"

### Lógica de Cálculo
```javascript
const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
const indexOfLastOrder = currentPage * ordersPerPage;
const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
```

## Funcionalidades Especiales

### 1. Ordenamiento Inteligente
Los pedidos se ordenan por número secuencial descendente, mostrando siempre los más recientes primero.

### 2. Búsqueda Versátil
La búsqueda funciona en múltiples campos:
- Número de pedido
- Nombre del proveedor  
- Vehículo asociado

### 3. Generación Contextual de PAR
El sistema determina automáticamente el tipo de documento a generar basándose en el campo `es_externo` del proveedor.

### 4. Manejo de Estados Complejos
Gestión coordinada de múltiples estados para una experiencia de usuario fluida.

## Dependencias

### Principales
- `react`: Framework base
- `react-router-dom`: Navegación y parámetros URL
- `@supabase/supabase-js`: Base de datos
- `uuid`: Generación de IDs únicos
- `date-fns`: Formateo de fechas
- `file-saver`: Descarga de archivos

### UI y Estilado
- `@radix-ui/*`: Componentes base de shadcn/ui
- `lucide-react`: Iconografía
- `tailwindcss`: Estilos CSS

## Consideraciones de Rendimiento

### Optimizaciones
- Carga inicial única de pedidos
- Filtrado en memoria para búsquedas rápidas
- Paginación para reducir renderizado
- Lazy loading de modales

### Gestión de Memoria
- Limpieza de estados al cerrar modales
- Reutilización de componentes
- Evitar re-renderizados innecesarios

## Casos de Uso

### 1. Administrador de Almacén
- Crear nuevos pedidos de repuestos
- Gestionar stock y proveedores
- Generar documentación oficial

### 2. Personal Técnico
- Consultar pedidos existentes
- Verificar estados de envío
- Generar PARs para autorizaciones

### 3. Gestión Documental
- Imprimir documentos PAR
- Exportar datos a Excel
- Mantener trazabilidad de cambios

## Mantenimiento y Extensibilidad

### Áreas de Mejora Potencial
- Implementar filtros avanzados
- Añadir exportación masiva
- Integrar notificaciones en tiempo real
- Optimizar consultas de base de datos

### Patrones Utilizados
- **Hooks personalizados**: `useToast` para notificaciones
- **Separación de responsabilidades**: Lógica de datos separada de UI
- **Componentes reutilizables**: Modales y formularios modulares
- **Estado centralizado**: Gestión coordinada de todos los estados