# Componente MaterialNotFoundModal

## Descripción

El componente `MaterialNotFoundModal` es un diálogo modal especializado que se muestra cuando un usuario intenta buscar un material utilizando una matrícula que no existe en la base de datos. Proporciona la opción de crear un nuevo material con esa matrícula o cancelar la operación.

## Características Principales

### Accesibilidad y Navegación por Teclado
- **Focus automático**: Al abrir el modal, el focus se coloca automáticamente en el botón "Cancelar" como acción conservadora
- **Navegación con Tab**: Permite navegar entre los botones usando la tecla Tab
- **Teclas de acceso rápido**:
  - `Escape`: Cancela y cierra el modal
  - `Enter`: Ejecuta la acción del botón que tiene el focus (por defecto cancela)

### Prevención de Acciones Accidentales
- **No se puede cerrar haciendo clic fuera**: Previene el cierre accidental del modal
- **Bloqueo de scroll**: Evita el desplazamiento del contenido de fondo mientras el modal está abierto
- **Interceptación de teclas**: Previene acciones no deseadas con otras teclas

### Interfaz de Usuario
- **Icono de advertencia**: Utiliza el icono `AlertTriangle` para indicar que se requiere atención
- **Información clara**: Muestra la matrícula específica que no fue encontrada
- **Botones diferenciados**: 
  - Botón "Cancelar" con estilo outline
  - Botón "Dar de alta" con colores corporativos (#91268F)

## Propiedades (Props)

| Prop | Tipo | Descripción |
|------|------|-------------|
| `open` | `boolean` | Controla si el modal está visible |
| `registration` | `string` | La matrícula que no fue encontrada |
| `onClose` | `() => void` | Callback para cerrar el modal |
| `onCreateMaterial` | `() => void` | Callback para crear un nuevo material |
| `onCancel` | `() => void` | Callback para cancelar la operación y limpiar campos |

## Ejemplo de Uso

```tsx
import MaterialNotFoundModal from './MaterialNotFoundModal';

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchedRegistration, setSearchedRegistration] = useState('');

  const handleCreateMaterial = () => {
    // Lógica para crear nuevo material
    console.log('Creando material con matrícula:', searchedRegistration);
    setModalOpen(false);
  };

  const handleCancel = () => {
    // Limpiar el campo de búsqueda
    setSearchedRegistration('');
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  return (
    <MaterialNotFoundModal
      open={modalOpen}
      registration={searchedRegistration}
      onClose={handleClose}
      onCreateMaterial={handleCreateMaterial}
      onCancel={handleCancel}
    />
  );
}
```

## Dependencias

El componente requiere las siguientes dependencias:

### Componentes UI
- `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle` de `@/components/ui/dialog`
- `Button` de `@/components/ui/button`

### Iconos
- `AlertTriangle` de `lucide-react`

### Hooks de React
- `useEffect` para efectos secundarios
- `useRef` para referencias a elementos DOM

## Flujo de Interacción

1. **Apertura del Modal**: Cuando `open` es `true`, el modal se muestra y el focus se coloca en "Cancelar"
2. **Navegación**: El usuario puede usar Tab para moverse entre botones
3. **Acciones Disponibles**:
   - **Cancelar**: Limpia los campos y cierra el modal
   - **Dar de alta**: Procede a crear un nuevo material
4. **Cierre**: El modal se cierra automáticamente después de cualquier acción

## Notas de Implementación

### Gestión del Focus
```tsx
useEffect(() => {
  if (open && cancelButtonRef.current) {
    setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 100);
  }
}, [open]);
```

### Manejo de Eventos de Teclado
```tsx
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      handleCancel();
      break;
    case 'Enter':
      event.preventDefault();
      if (document.activeElement === createButtonRef.current) {
        handleCreateMaterial();
      } else {
        handleCancel();
      }
      break;
  }
};
```

## Consideraciones de UX

- **Acción por defecto conservadora**: Si el usuario presiona Enter sin navegar, se ejecuta la acción de cancelar
- **Prevención de pérdida de datos**: El modal no se puede cerrar accidentalmente
- **Feedback visual**: Incluye indicadores de las teclas de acceso rápido en la parte inferior
- **Colores corporativos**: Utiliza la paleta de colores de la marca (#91268F)

## Estilos CSS Personalizados

El componente utiliza clases de Tailwind CSS con algunos valores personalizados:

```css
/* Colores corporativos */
.bg-[#91268F] /* Color principal */
.hover:bg-[#7A1F79] /* Color hover */
.focus:ring-[#91268F] /* Color del anillo de focus */
```

## Casos de Uso

- **Búsqueda de materiales**: Cuando un material no existe en la base de datos
- **Registro rápido**: Facilita la creación inmediata de materiales faltantes
- **Validación de entrada**: Parte del flujo de validación de formularios
- **Gestión de inventarios**: En sistemas de control de materiales y equipos