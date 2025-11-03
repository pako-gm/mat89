# Desglose de Funciones - ConsultaPage.tsx

## 🔍 **Componente Principal**

### `ConsultaPage()`
**Propósito**: Componente React principal que renderiza la página de consulta de envíos y recepciones.
**Funcionalidad**: Gestiona todo el estado y la UI para mostrar, filtrar y exportar datos de consulta.

---

## 📊 **Gestión de Estado (useState)**

### Estados de Datos
- `consultationData`: Almacena todos los registros de consulta originales
- `filteredData`: Contiene los registros filtrados según la búsqueda
- `searchQuery`: Guarda el texto de búsqueda actual

### Estados de UI y Control
- `currentPage`: Página actual en la paginación
- `isLoading`: Indica si se están cargando los datos inicialmente
- `isRefreshing`: Muestra si se está actualizando la información
- `showPrintModal`: Controla la visibilidad del modal de impresión
- `htmlContent`: Almacena el HTML generado para impresión

### Configuración
- `recordsPerPage`: Constante que define 50 registros por página

---

## 🔄 **Funciones de Efectos (useEffect)**

### `useEffect(() => { fetchConsultationData(); }, [])`
**Propósito**: Ejecuta la carga inicial de datos al montar el componente.
**Cuándo se ejecuta**: Una sola vez al cargar la página.

### `useEffect(() => { filterData(); }, [searchQuery, consultationData])`
**Propósito**: Aplica automáticamente el filtro cuando cambia la búsqueda o los datos.
**Cuándo se ejecuta**: Cada vez que se modifica el texto de búsqueda o se actualizan los datos.

---

## 📡 **Funciones de Datos**

### `fetchConsultationData()`
**Propósito**: Obtiene los datos de consulta desde la API/servicio.
**Funcionalidades**:
- Activa el estado de carga
- Llama al servicio `getConsultationData()`
- Actualiza los estados de datos
- Maneja errores con toast de notificación
- Desactiva el estado de carga

### `handleRefresh()`
**Propósito**: Permite actualizar manualmente los datos.
**Funcionalidades**:
- Activa el estado de actualización
- Ejecuta `fetchConsultationData()`
- Muestra notificación de éxito o error
- Desactiva el estado de actualización

---

## 🔍 **Funciones de Filtrado y Búsqueda**

### `filterData()`
**Propósito**: Filtra los registros según el texto de búsqueda.
**Campos de búsqueda**:
- Número de pedido (`numPedido`)
- Material 89 (`mat89`)
- Proveedor (`proveedor`)
- Descripción (`descripcion`)
- Vehículo (`vehiculo`)
- Fecha de envío (`fechaEnvio`)
- Número de serie envío (`numSerieEnv`)
- Fecha de recepción (`fechaRecepc`)
- Número de serie recepción (`numSerieRec`)
- Estado de recepción (`estadoRecepc`)

**Características**:
- Búsqueda insensible a mayúsculas/minúsculas
- Búsqueda en múltiples campos simultáneamente
- Resetea la página actual a 1 después del filtro

---

## 🎨 **Funciones de Formato y Presentación**

### `formatDate(dateString)`
**Propósito**: Convierte fechas a formato español legible.
**Entrada**: String de fecha o null
**Salida**: Fecha formateada (ej: "15/03/2024") o "--" si es null
**Manejo de errores**: Devuelve el string original si no se puede convertir

### `getStatusColor(status)`
**Propósito**: Asigna colores CSS según el estado de recepción.
**Mapeo de colores**:
- `'UTIL'`: Verde (componente útil)
- `'IRREPARABLE'`: Rojo (componente dañado)
- `'SIN ACTUACION'`: Amarillo (pendiente)
- `'OTROS'`: Azul (otros estados)
- `null/undefined`: Gris (sin estado)

---

## 📄 **Funciones de Paginación**

### Cálculos de Paginación (variables computadas)
- `totalPages`: Calcula el total de páginas necesarias
- `indexOfLastRecord`: Índice del último registro en la página actual
- `indexOfFirstRecord`: Índice del primer registro en la página actual
- `currentRecords`: Slice de registros para mostrar en la página actual

### `paginate(pageNumber)`
**Propósito**: Cambia a una página específica.
**Validaciones**: 
- Verifica que el número de página sea válido (> 0 y <= totalPages)
- Actualiza el estado `currentPage`

---

## 📄 **Funciones de Exportación e Impresión**

### `generateHTMLDocument()`
**Propósito**: Genera un documento HTML completo para impresión/exportación.
**Características**:
- **Header personalizado**: Logo y título del sistema Mat89
- **Estilos CSS integrados**: Diseño profesional con colores corporativos
- **Información contextual**: 
  - Total de registros mostrados
  - Información de filtrado si aplica
  - Fecha y hora de generación
- **Tabla completa**: Todos los campos de datos formateados
- **Estados coloreados**: Mismo esquema de colores que la UI
- **Responsive**: Ajustes específicos para impresión
- **Footer corporativo**: Información de copyright

**Datos incluidos**:
- Línea, Almacén, Número de Pedido
- Proveedor, Material 89, Descripción
- Vehículo, Fechas, Cantidades
- Números de serie, Estados, Observaciones

### `handleDownloadData()`
**Propósito**: Prepara y muestra el modal de descarga/impresión.
**Proceso**:
1. Genera el HTML con `generateHTMLDocument()`
2. Establece el contenido HTML en el estado
3. Abre el modal de impresión

---

## 🎯 **Funciones de Interfaz de Usuario**

### Gestores de Eventos
- **Búsqueda**: `onChange` en el input de búsqueda actualiza `searchQuery`
- **Limpiar búsqueda**: `onClick` resetea `searchQuery` a string vacío
- **Botones de paginación**: Utilizan `paginate()` con diferentes parámetros
- **Actualizar**: `onClick` ejecuta `handleRefresh()`
- **Descargar**: `onClick` ejecuta `handleDownloadData()`

### Elementos de UI Condicionales
- **Indicador de carga**: Spinner animado durante `isLoading`
- **Indicador de actualización**: Ícono giratorio durante `isRefreshing`
- **Contador de filtros**: Muestra "X de Y registros" cuando hay filtros activos
- **Mensajes de estado**: "No se encontraron registros" vs "No hay datos disponibles"
- **Paginación condicional**: Solo se muestra si hay más de 50 registros

---

## 📊 **Sección de Resumen (Estadísticas)**

### Cálculos Estadísticos (computados en tiempo real)
- **Total de registros**: `consultationData.length`
- **Componentes útiles**: Cuenta registros con `estadoRecepc === 'UTIL'`
- **Componentes irreparables**: Cuenta registros con `estadoRecepc === 'IRREPARABLE'`
- **Sin recepción**: Cuenta registros con `estadoRecepc` null/undefined

---

## 🛠 **Tecnologías y Dependencias Utilizadas**

### Librerías React
- **useState**: Gestión de estado local
- **useEffect**: Efectos secundarios y ciclo de vida
- **useToast**: Hook personalizado para notificaciones

### Componentes UI (Shadcn/UI)
- **Input**: Campo de búsqueda
- **Button**: Botones de acción
- **Table**: Componentes de tabla (Table, TableBody, TableCell, etc.)

### Iconos (Lucide React)
- **Search**: Ícono de búsqueda
- **Chevron/ChevronsLeft/Right**: Navegación de paginación
- **RefreshCw**: Ícono de actualización
- **Download**: Ícono de descarga

### Servicios Personalizados
- **getConsultationData**: Servicio para obtener datos de consulta
- **PrintModal**: Modal personalizado para vista previa de impresión

---

## 🔧 **Características Técnicas Destacadas**

### Rendimiento
- **Paginación**: Mejora el rendimiento con grandes conjuntos de datos
- **Filtrado eficiente**: Búsqueda en memoria sin llamadas adicionales a la API
- **Lazy loading**: Carga inicial controlada con estados de loading

### Experiencia de Usuario
- **Búsqueda en tiempo real**: Filtrado instantáneo mientras se escribe
- **Feedback visual**: Estados de carga, actualización y notificaciones
- **Navegación intuitiva**: Paginación completa con saltos rápidos
- **Exportación profesional**: Documentos HTML formateados para impresión

### Mantenibilidad
- **Separación de responsabilidades**: Funciones específicas y bien definidas
- **Manejo de errores**: Try-catch y notificaciones de usuario
- **Código limpio**: Nombres descriptivos y estructura clara
- **Responsive**: Adaptable a diferentes tamaños de pantalla