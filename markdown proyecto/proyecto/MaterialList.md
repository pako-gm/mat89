# Componente MaterialList React

## Descripción General
El componente `MaterialList` es una tabla integral construida con React y TypeScript que muestra una lista paginada, searchable y ordenable de materiales. Utiliza componentes de shadcn/ui para un sistema de diseño consistente.

## Características
- **Funcionalidad de búsqueda**: Filtrar materiales por número de matrícula, descripción o serie de vehículo
- **Ordenamiento**: Ordenar por matrícula o descripción en orden ascendente/descendente
- **Paginación**: Mostrar materiales en páginas con controles de navegación
- **Estados de carga**: Muestra spinner de carga mientras obtiene los datos
- **Estados vacíos**: Muestra mensajes apropiados cuando no se encuentran datos
- **Diseño responsivo**: La tabla se adapta a diferentes tamaños de pantalla

## Props

```typescript
interface MaterialListProps {
  onViewDetails: (material: Material) => void;
  refreshTrigger: number;
}
```

- `onViewDetails`: Función callback llamada cuando se hace clic en una fila de material
- `refreshTrigger`: Número que activa la actualización de datos cuando cambia

## Dependencias

### React Hooks
- `useState`: Gestiona el estado del componente
- `useEffect`: Maneja efectos secundarios y obtención de datos

### Componentes UI (shadcn/ui)
- `Input`: Campo de entrada para búsqueda
- `Button`: Varios botones de acción
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`: Componentes de tabla

### Iconos (lucide-react)
- `Search`: Icono de entrada de búsqueda
- `ChevronLeft`, `ChevronRight`, `ChevronsLeft`, `ChevronsRight`: Iconos de paginación
- `ArrowUpDown`, `ArrowUp`, `ArrowDown`: Iconos de ordenamiento

### Dependencias Personalizadas
- Tipo `Material` de `@/types`
- `getAllMaterials` de `@/lib/data`
- `useToast` de `@/hooks/use-toast`

## Estado del Componente

```typescript
// Estados principales
const [materials, setMaterials] = useState<Material[]>([]);
const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
const [searchQuery, setSearchQuery] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const [isLoading, setIsLoading] = useState(true);

// Estados de ordenamiento
const [sortField, setSortField] = useState<SortField>('registration');
const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
```

## Tipos Definidos

```typescript
type SortField = 'registration' | 'description';
type SortOrder = 'asc' | 'desc' | null;
```

## Funcionalidades Principales

### 1. Obtención de Datos
```typescript
const fetchMaterials = async () => {
  setIsLoading(true);
  try {
    const data = await getAllMaterials();
    setMaterials(data);
    setFilteredMaterials(data);
  } catch (error) {
    // Manejo de errores con toast
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Sistema de Búsqueda
- Busca en múltiples campos: matrícula, descripción y serie de vehículo
- Búsqueda insensible a mayúsculas/minúsculas
- Filtrado en tiempo real

```typescript
const filtered = materials.filter(
  (material) =>
    material.registration.toString().includes(searchQuery) ||
    material.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (material.vehicleSeries && material.vehicleSeries.toLowerCase().includes(searchQuery.toLowerCase()))
);
```

### 3. Sistema de Ordenamiento
- Ordenamiento por matrícula o descripción
- Tres estados: ascendente → descendente → sin ordenar
- Indicadores visuales del estado actual

```typescript
const handleSort = (field: SortField) => {
  if (sortField === field) {
    if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else if (sortOrder === 'desc') {
      setSortOrder(null);
      setSortField('registration');
    } else {
      setSortOrder('asc');
    }
  } else {
    setSortField(field);
    setSortOrder('asc');
  }
};
```

### 4. Paginación
- Configurable (actualmente 10 elementos por página)
- Controles de navegación completos
- Indicador de página actual

```typescript
const materialsPerPage = 10;
const totalPages = Math.ceil(filteredMaterials.length / materialsPerPage);
const currentMaterials = filteredMaterials.slice(indexOfFirstMaterial, indexOfLastMaterial);
```

## Estructura de la Interfaz

### Encabezado
- Campo de búsqueda con icono
- Botón "Borrar Filtro"

### Tabla
- Columnas ordenables: Matrícula 89, Descripción
- Columna no ordenable: Serie Vehículo
- Filas clickeables que activan `onViewDetails`

### Paginación (cuando aplica)
- Botones de primera/última página
- Botones de página anterior/siguiente
- Indicador de página actual

## Estados de la UI

### Estado de Carga
```jsx
<div className="flex justify-center items-center">
  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#91268F]"></div>
  <span className="ml-2">Cargando materiales...</span>
</div>
```

### Estado Vacío
- Con búsqueda: "No se encontraron materiales que coincidan con la búsqueda"
- Sin datos: "No hay materiales registrados. Haga clic en 'Nuevo Material' para agregar uno."

## Estilos y Clases CSS

### Colores Principales
- Color de carga: `#91268F` (morado corporativo)
- Hover de filas: `hover:bg-gray-50`
- Encabezado de tabla: `bg-gray-50`

### Clases de Transición
- `transition-colors duration-200`: Para efectos suaves de hover
- `transition-colors cursor-pointer`: Para filas interactivas

## Funciones de Utilidad

### clearFilter()
```typescript
const clearFilter = () => {
  setSearchQuery("");
  setFilteredMaterials(materials);
  // Mantener el foco en el campo de búsqueda
  const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
  if (searchInput) {
    searchInput.focus();
  }
};
```

### getSortIcon()
```typescript
const getSortIcon = (field: SortField) => {
  if (sortField !== field || !sortOrder) {
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  }
  return sortOrder === 'asc' 
    ? <ArrowUp className="h-4 w-4 text-gray-600" />
    : <ArrowDown className="h-4 w-4 text-gray-600" />;
};
```

## Uso del Componente

```jsx
<MaterialList 
  onViewDetails={(material) => {
    // Manejar visualización de detalles
    console.log('Ver detalles de:', material);
  }}
  refreshTrigger={refreshCounter}
/>
```

## Consideraciones de Rendimiento
- Filtrado y ordenamiento se realizan en el cliente
- Re-renderizado optimizado con useEffect dependencies
- Paginación reduce la cantidad de elementos DOM

## Accesibilidad
- Botones de ordenamiento tienen etiquetas descriptivas
- Estados de carga son anunciados
- Navegación por teclado soportada en inputs y botones