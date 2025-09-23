# Documentación del Componente OrderForm

## Descripción General

El componente **OrderForm** es un formulario modal completo y avanzado para la gestión integral de pedidos de materiales en el sistema de almacén. Este componente React implementa una interfaz robusta que soporta múltiples modos de operación (creación, edición y visualización), con funcionalidades avanzadas como autocompletado inteligente, validación en tiempo real, gestión de archivos y sistema de comentarios con historial.

## Características Principales

### 🎯 Modos de Operación
- **Modo Creación**: Para crear nuevos pedidos desde cero
- **Modo Edición**: Para modificar pedidos existentes
- **Modo Vista**: Para visualizar pedidos en solo lectura con opción de edición

### ✅ Funcionalidades Avanzadas
- **Autocompletado inteligente** para materiales
- **Validación en tiempo real** con indicadores visuales
- **Gestión de archivos** con drag & drop
- **Sistema de comentarios** con historial completo
- **Autenticación y permisos** integrados
- **Numeración automática** de pedidos
- **Múltiples formatos** de archivo soportados
- **Interfaz responsiva** y accesible

## Props del Componente

```typescript
interface OrderFormProps {
  order: Order;              // Pedido inicial o vacío
  open: boolean;             // Control de visibilidad del modal
  onClose: () => void;       // Callback para cerrar el modal
  onSave: () => void;        // Callback después de guardar
  isEditing: boolean;        // Indica si es modo edición
  viewMode?: boolean;        // Modo solo lectura (opcional)
  suppliers?: array;         // Lista de proveedores
  warehouses?: array;        // Lista de almacenes
  loading?: boolean;         // Estado de carga
}
```

## Estructura de Datos

### Objeto Order Principal

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
  shipmentDocumentation: string[];
  changeHistory: ChangeHistoryEntry[];
  orderLines: OrderLine[];
}
```

### Línea de Pedido

```typescript
interface OrderLine {
  id: string;
  registration: string;      // Matrícula 89
  partDescription: string;   // Descripción de la pieza
  quantity: number;          // Cantidad (mínimo 1)
  serialNumber: string;      // Número de serie (opcional)
}
```

## Campos del Formulario

### 📋 Información Básica
- **Número de Pedido**: Campo de solo lectura con formato automático `{almacén}/25/1001`
- **Razón Social**: Selector de proveedores (campo requerido)
- **Almacén**: Selector de almacenes con valor por defecto `ALM141`

### 🚗 Información del Vehículo y Garantía
- **Vehículo**: Campo con formato automático `XXX-XXX` (campo requerido)
- **Garantía**: Switch para activar/desactivar
- **Informe No Conformidad**: Habilitado solo si la garantía está activa

### 📅 Fechas
- **Fecha Desmonte**: Campo de fecha requerido
- **Fecha Envío**: Campo de fecha requerido (debe ser posterior al desmonte)

### 📝 Información Adicional
- **Avería Declarada**: Área de texto con conversión automática a mayúsculas
- **Documentación Envío**: Sistema de carga de archivos drag & drop

## Estados del Componente

### Estados de Datos
```javascript
const [order, setOrder] = useState(initialOrderData)        // Estado principal del pedido
const [suppliers, setSuppliers] = useState([])              // Lista de proveedores
const [errors, setErrors] = useState({})                    // Estado de validación
```

### Estados de UI
```javascript
const [loading, setLoading] = useState(false)               // Indicador de carga
const [dragActive, setDragActive] = useState(false)         // Estado de drag & drop
const [inEditMode, setInEditMode] = useState(false)         // Control de modo edición
```

### Estados de Modales
```javascript
const [isCommentOpen, setIsCommentOpen] = useState(false)   // Control modal comentarios
const [materialNotFoundModal, setMaterialNotFoundModal] = useState(false) // Modal material no encontrado
const [newComment, setNewComment] = useState('')            // Texto nuevo comentario
```

## Sistema de Validación

### ✅ Validaciones de Campos Requeridos

```typescript
const validateForm = () => {
  const hasValidOrderLine = order.orderLines.some(line => 
    String(line.registration).trim() !== ""
  );

  const newErrors = {
    supplier: !order.supplierId,           // Razón Social requerida
    vehicle: !order.vehicle.trim(),        // Vehículo requerido
    dismantleDate: !order.dismantleDate,   // Fecha desmonte requerida
    shipmentDate: !order.shipmentDate,     // Fecha envío requerida
    orderLines: !hasValidOrderLine         // Al menos una línea válida
  };

  return !Object.values(newErrors).some(Boolean);
};
```

### 📅 Validaciones de Fechas
- La fecha de envío debe ser posterior a la fecha de desmonte
- Restricciones en selectores de fecha para evitar inconsistencias

### 🚗 Validaciones de Formato
- **Vehículo**: Formato `XXX-XXX` automático
- **Matrícula**: Validación de formato `89XXXXXX`
- **Texto**: Conversión automática a mayúsculas donde corresponde

## Funcionalidades Principales

### 1. Gestión de Modos de Operación

```typescript
const getTitle = () => {
  if (viewMode && !inEditMode) {
    return "Detalles del Pedido";
  }
  return initialIsEditing ? "Editar Pedido" : "Nuevo Pedido";
};

const isReadOnly = viewMode && !inEditMode;
```

### 2. Numeración Automática de Pedidos

```typescript
// Formato: ALM_NUMBER/YY/SEQUENTIAL
const warehouseNum = value.replace('ALM', '');
const currentYear = new Date().getFullYear().toString().slice(-2);
const formattedValue = `${warehouseNum}/${currentYear}/${sequential}`;
```

### 3. Gestión de Líneas de Pedido

#### Agregar Nueva Línea
- Valida que no haya líneas vacías antes de agregar
- Genera ID único para cada línea
- Inicializa cantidad en 1

```javascript
const addOrderLine = () => {
  const newLine = {
    id: uuidv4(),
    registration: '',
    partDescription: '',
    quantity: 1,
    serialNumber: ''
  };
  
  setOrder(prev => ({
    ...prev,
    orderLines: [...prev.orderLines, newLine]
  }));
};
```

#### Actualizar Línea
- Soporte para autocompletado de materiales
- Validación de cantidad (mínimo 1)
- Limpieza de errores en tiempo real

#### Eliminar Línea
- Mantiene al menos una línea siempre
- Limpia referencias de inputs

### 4. 💬 Sistema de Comentarios

```typescript
const handleAddComment = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || 'admin@renfe.es'; //usuario por defecto si no detecta uno

  const newChange = {
    id: uuidv4(),
    date: new Date().toISOString(),
    user: userEmail,
    description: newComment.trim()
  };

  setOrder(prev => ({
    ...prev,
    changeHistory: [...prev.changeHistory, newChange]
  }));
};
```

#### Características del Sistema de Comentarios
- **Historial Completo**: Vista cronológica de comentarios de usuarios
- **Información del Usuario**: Muestra usuario, fecha y hora
- **Modal Interactivo**: Interface dedicada para añadir comentarios
- **Interfaz Visual**: Iconos y colores distintivos

### 5. 📎 Sistema de Documentación y Archivos

#### Características
- **Formatos Permitidos**: `.pdf`, `.jpeg`, `.jpg`, `.xlsx`, `.zip` //deberia de limitar los tipos de formatos a .pdf - **Límites**: Máximo 4 archivos, 5 MB cada uno
- **Funcionalidad**: Drag & drop y selección manual
- **Vista Previa**: Lista de archivos cargados con opción de eliminación

#### Validación de Archivos

```typescript
const validateFile = (file: File) => {
  const validTypes = ['.pdf', '.jpeg', '.jpg', '.xlsx', '.zip'];
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isValidType = validTypes.includes(extension);
  const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
  return isValidType && isValidSize;
};
```

#### Drag & Drop Implementation

```javascript
const handleDrop = (e) => {
  e.preventDefault();
  setDragActive(false);
  const files = [...e.dataTransfer.files];
  
  // Validación y procesamiento de archivos
  const validFiles = files.filter(validateFile);
  
  // Agregar archivos al estado
  setOrder(prev => ({
    ...prev,
    shipmentDocumentation: [...prev.shipmentDocumentation, ...validFiles]
  }));
};
```

### 6. 🔍 Autocompletado de Materiales

- **Integración con MaterialAutocompleteInput**
- **Manejo de materiales no encontrados**
- **Modal para crear nuevos materiales**
- **Referencias para gestión de focus**
- **Validación en tiempo real**

#### Componente MaterialAutocompleteInput
Componente especializado para la búsqueda y selección de materiales:
- Autocompletado en tiempo real
- Validación de formato de matrícula
- Manejo de materiales no encontrados
- Integración fluida con el formulario principal

### 7. 🔐 Autenticación y Permisos

```typescript
const checkUserAuthentication = async () => {
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data.user?.id) {
    setAuthError("Error de autenticación");
    return false;
  }

  const hasPermission = await hasAnyRole(['ADMINISTRADOR', 'EDICION']);
  
  if (!hasPermission) {
    setAuthError("No tiene permisos suficientes");
    return false;
  }

  return true;
};
```

## 📊 Líneas de Pedido - Gestión Avanzada

### Campos por Línea
- **Matrícula 89**: Campo requerido con autocompletado inteligente
- **Descripción Pieza**: Campo de solo lectura poblado automáticamente
- **Cantidad**: Campo numérico con validación (mínimo 1)
- **Número de Serie**: Campo opcional para trazabilidad

### Funcionalidades de Líneas
- **Autocompletado Inteligente**: Búsqueda de materiales por matrícula
- **Validación en Tiempo Real**: Verificación de datos al escribir
- **Gestión Dinámica**: Añadir/eliminar líneas según necesidad
- **Material No Encontrado**: Modal para crear nuevos materiales

## Componentes Auxiliares

### 📄 MaterialNotFoundModal
Modal especializado para gestionar casos donde no se encuentra un material:
- Opción para crear nuevo material
- Cancelación de la operación
- Integración perfecta con el flujo principal
- Validación de datos antes de creación

### 🎛️ Funciones Principales
- `handleSubmit()`: Procesamiento completo del formulario
- `handleChange()`: Manejo de cambios en inputs generales
- `handleSelectChange()`: Manejo específico de selects
- `addOrderLine()`: Añadir nueva línea de pedido
- `handleOrderLineDelete()`: Eliminar línea de pedido con validaciones
- `handleFileSelect()`: Gestión avanzada de archivos
- `handleAddComment()`: Añadir comentarios al historial

## Hooks Utilizados

- **useState**: Gestión de estado local múltiple
- **useEffect**: Efectos secundarios y sincronización
- **useRef**: Referencias a elementos DOM para optimización
- **useNavigate**: Navegación programática
- **useToast**: Sistema de notificaciones de usuario

## Dependencias y Componentes

### Componentes UI Base
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- `Input`, `Button`, `Label`, `Textarea`, `Switch`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Card`, `CardContent`

### Componentes Personalizados
- **MaterialNotFoundModal**: Modal para materiales no encontrados
- **MaterialAutocompleteInput**: Input con autocompletado avanzado

### Iconografía (Lucide React)
- `Upload`, `PlusCircle`, `Trash2`, `Check`, `MessageCircle`
- `Send`, `User`, `Clock`, `Edit2`

### Servicios y Utilidades
- **supabase**: Cliente de base de datos y autenticación
- **warehouses**, **getSuppliers**, **saveOrder**: Funciones de datos
- **hasAnyRole**: Verificación de permisos de usuario
- **filterManualChangeHistory**, **formatDateToDDMMYYYY**: Utilidades de formato

## Estilos y Diseño

### 🎨 Paleta de Colores
- **Principal**: `#91268F` (morado corporativo)
- **Hover**: `#7A1F79` (morado oscuro)
- **Bordes**: `#4C4C4C` (gris oscuro)
- **Error**: `#ef4444` (rojo de validación)

### 📱 Diseño Responsivo
- Uso de **CSS Grid** para layouts adaptativos
- Clase `max-w-[90vw] max-h-[90vh]` para modal responsivo
- **Componentes Tailwind CSS** para consistencia visual
- Breakpoints optimizados para dispositivos móviles y desktop

## Flujo de Trabajo Completo

### 1. Inicialización
1. Se inicializa el estado con datos del pedido
2. Se cargan los proveedores disponibles
3. Se establecen los modos de operación
4. Se configuran las referencias de componentes

### 2. Interacción del Usuario
1. Usuario modifica campos del formulario
2. Validación en tiempo real activada
3. Actualización de estado reactiva
4. Limpieza automática de errores

### 3. Gestión de Líneas
1. Usuario agrega/modifica líneas de pedido
2. Autocompletado de materiales en tiempo real
3. Validación de datos de líneas
4. Gestión de materiales no encontrados

### 4. Guardado y Persistencia
1. Validación completa del formulario
2. Verificación de autenticación y permisos
3. Guardado seguro en base de datos
4. Notificación de resultado al usuario

## Consideraciones Técnicas

### ⚡ Rendimiento y Optimización
- **Referencias optimizadas** para inputs de materiales
- **Validación eficiente** con debounce implícito
- **Gestión de memoria** con cleanup de referencias
- **Lazy loading** de componentes pesados
- **Uso de useRef** para evitar renders excesivos

### 🔒 Accesibilidad
- **Labels apropiados** para todos los inputs
- **Estados de error** claramente indicados
- **Navegación por teclado** completamente soportada
- **Contraste adecuado** para legibilidad
- **ARIA labels** para lectores de pantalla

### 🛡️ Seguridad
- **Validación dual** (cliente y servidor)
- **Verificación de permisos** antes de operaciones críticas
- **Sanitización de datos** de entrada
- **Autenticación robusta** con Supabase
- **Control de acceso** por roles

### 🔧 Mantenibilidad
- **Código modular** con funciones específicas
- **Estados bien organizados** y documentados
- **Documentación inline** abundante
- **Separación de responsabilidades** clara
- **Componentes reutilizables**

## Limitaciones Actuales

### ⚠️ Restricciones Técnicas
- La carga de archivos puede estar deshabilitada en algunos entornos
- El botón "Agregar Comentario" puede requerir permisos específicos
- Algunos campos tienen valores hardcodeados para demostración
- Limitación de 4 archivos por pedido

## Posibles Mejoras y Evolución

### 🚀 Mejoras de Rendimiento
1. **Optimización con React.memo** para componentes pesados
2. **Implementación de React.lazy** para carga bajo demanda
3. **Memoización de funciones** complejas con useCallback
4. **Virtualización** para listas largas de materiales

### 🎯 Mejoras de Funcionalidad
1. **Validación avanzada** con esquemas Zod o similar
2. **Preview de archivos** PDF/imágenes integrado
3. **Autoguardado de borradores** para prevenir pérdida de datos
4. **Campos personalizados** por tipo de pedido
5. **Historial de versiones** con rollback

### 🧪 Testing y Calidad
1. **Unit tests** completos con Jest y React Testing Library
2. **Integration tests** para flujos completos
3. **E2E testing** con Cypress o Playwright
4. **Análisis de cobertura** de código

### 🌐 Internacionalización
1. **Soporte multi-idioma** con i18next
2. **Formatos de fecha** regionalizados
3. **Validaciones** adaptadas por región
4. **Moneda y números** según locale

### 📱 Capacidades Offline
1. **Service Workers** para funcionamiento offline
2. **Sincronización automática** al restaurar conexión
3. **Cache inteligente** de datos críticos
4. **Notificaciones** de estado de conectividad

### 📋 Auditoría y Trazabilidad
1. **Registro detallado** de todos los cambios
2. **Audit trail** completo con timestamps
3. **Reportes de actividad** por usuario
4. **Backup automático** de datos críticos

## Conclusión

El componente **OrderForm** representa una solución integral y robusta para la gestión de pedidos de materiales, combinando una interfaz de usuario intuitiva con funcionalidades avanzadas de validación, autocompletado y gestión de archivos. Su arquitectura modular y extensible permite adaptarse a diferentes necesidades empresariales mientras mantiene altos estándares de usabilidad, seguridad y rendimiento.

La implementación actual proporciona una base sólida que puede evolucionar según las necesidades del negocio, con múltiples puntos de extensión identificados para futuras mejoras. El componente sirve como pieza central del sistema de gestión de pedidos, ofreciendo una experiencia de usuario excepcional tanto para usuarios novatos como avanzados.