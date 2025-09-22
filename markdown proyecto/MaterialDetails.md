# MaterialDetails Component

## Descripción
Componente React que muestra los detalles de un material en un diálogo modal. Proporciona una interfaz completa para visualizar información detallada de materiales con opciones para editar y eliminar.

## Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `material` | `Material` | Objeto que contiene toda la información del material |
| `open` | `boolean` | Controla si el diálogo está abierto o cerrado |
| `onClose` | `() => void` | Función que se ejecuta al cerrar el diálogo |
| `onEdit` | `() => void` | Función que se ejecuta al hacer clic en editar |
| `onDelete` | `() => void` | Función que se ejecuta al hacer clic en eliminar |

## Estructura del Material

El objeto `Material` debe contener las siguientes propiedades:

```typescript
interface Material {
  registration: string;        // Matrícula del material
  description: string;         // Descripción del material
  vehicleSeries?: string;      // Serie del vehículo (opcional)
  createdAt?: string;          // Fecha de creación
  updatedAt?: string;          // Fecha de última actualización
  updatedBy?: string;          // Usuario que realizó la última actualización
  infoAdicional?: string;      // Información adicional (opcional)
}
```

## Características

### Interfaz de Usuario
- **Diálogo modal responsivo** con ancho máximo del 90% del viewport
- **Header con título** y botones de acción (Editar, Eliminar, Cerrar)
- **Diseño en dos columnas** para organizar la información
- **Scroll vertical** cuando el contenido excede 80vh

### Secciones de Información

#### 1. Cabecera del Material
- Muestra la matrícula con formato "Mat. {registration}"
- Descripción y serie del vehículo (si está disponible)
- Fondo oscuro para destacar la información principal

#### 2. Información del Material
- **Matrícula 89**: Número de registro del material
- **Descripción**: Descripción detallada del material
- **Serie Vehículo**: Serie del vehículo asociado (opcional)

#### 3. Información del Sistema
- **Fecha de Creación**: Timestamp de cuando se creó el registro
- **Última Actualización**: Fecha, hora y usuario de la última modificación

#### 4. Información Adicional
- Campo de texto libre para información extra
- Muestra mensaje informativo si no hay datos adicionales

### Funciones Auxiliares

#### `formatDate(dateString?: string)`
- Formatea fechas al formato "dd/MM/yyyy HH:mm"
- Maneja casos de error y valores nulos
- Retorna "--" si no hay fecha

#### `formatUpdatedByAndDate(dateString?: string, userEmail?: string)`
- Combina fecha formateada con email del usuario
- Usa "SISTEMA" como valor por defecto si no hay usuario
- Formato: "dd/MM/yyyy HH:mm - email@domain.com"

## Iconografía

El componente utiliza iconos de Lucide React:

| Icono | Uso |
|-------|-----|
| `Edit2` | Botón de editar |
| `Trash2` | Botón de eliminar |
| `X` | Botón de cerrar |
| `Hash` | Matrícula |
| `Package` | Descripción |
| `Factory` | Serie del vehículo |
| `Calendar` | Fecha de creación |
| `Clock` | Última actualización |

## Estilos y Diseño

### Colores
- **Cabecera**: Fondo gris oscuro (`bg-gray-900`) con texto blanco
- **Contenido**: Fondo gris claro (`bg-gray-50`) con bordes redondeados
- **Botón eliminar**: Texto rojo con hover en rojo más intenso

### Layout
- Grid de 2 columnas en pantallas grandes
- Espaciado consistente con gaps de 12px horizontalmente y 6px verticalmente
- Padding de 6px en contenedores principales

### Responsividad
- Ancho máximo del 90% del viewport
- Altura máxima del 80% del viewport con scroll
- Diseño adaptable a diferentes tamaños de pantalla

## Dependencias

### Componentes UI
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
```

### Librerías Externas
```typescript
import { format } from "date-fns";  // Para formateo de fechas
```

### Iconos
```typescript
import { Edit2, X, Package, Factory, Calendar, Hash, Trash2, User, Clock } from "lucide-react";
```

## Uso Ejemplo

```tsx
import MaterialDetails from './MaterialDetails';

function App() {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleEdit = () => {
    // Lógica para editar material
    console.log('Editando material:', selectedMaterial);
  };

  const handleDelete = () => {
    // Lógica para eliminar material
    console.log('Eliminando material:', selectedMaterial);
  };

  return (
    <>
      {selectedMaterial && (
        <MaterialDetails
          material={selectedMaterial}
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
```

## Notas de Implementación

1. **Manejo de errores**: Las funciones de formateo incluyen try-catch para manejar fechas inválidas
2. **Accesibilidad**: Incluye `sr-only` labels para lectores de pantalla
3. **Valores por defecto**: Muestra textos informativos cuando no hay datos disponibles
4. **Formato de fechas**: Utiliza date-fns para formateo consistente de fechas
5. **Preservación de formato**: La información adicional mantiene saltos de línea con `whitespace-pre-wrap`