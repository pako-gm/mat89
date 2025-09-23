# MaterialAutocompleteInput

Componente React que proporciona un campo de entrada especializado para matrículas de materiales con validación automática y autocompletado de descripciones.

## Características

- **Validación en tiempo real**: Verifica que la matrícula comience con "89" y tenga el formato correcto
- **Autocompletado inteligente**: Busca automáticamente la descripción del material cuando se completa la matrícula
- **Indicadores visuales**: Muestra estados de carga, errores y validación
- **Interfaz imperativa**: Expone métodos para controlar el componente externamente
- **Restricción de entrada**: Solo acepta números y limita la longitud a 8 dígitos

## Props

### `MaterialAutocompleteInputProps`

| Prop | Tipo | Descripción | Requerido | Valor por defecto |
|------|------|-------------|-----------|-------------------|
| `value` | `string` | Valor actual del input | ✅ | - |
| `onChange` | `(registration: string, description?: string) => void` | Callback ejecutado al cambiar el valor o encontrar material | ✅ | - |
| `onMaterialNotFound` | `(registration: string) => void` | Callback ejecutado cuando no se encuentra un material | ✅ | - |
| `placeholder` | `string` | Texto de placeholder | ❌ | `"89xxxxxx"` |
| `className` | `string` | Clases CSS adicionales | ❌ | `""` |
| `error` | `boolean` | Estado de error para estilos | ❌ | `false` |

## Ref

El componente expone una referencia con los siguientes métodos:

### `MaterialAutocompleteInputRef`

| Método | Tipo | Descripción |
|--------|------|-------------|
| `focus()` | `() => void` | Enfoca el campo de entrada |
| `clear()` | `() => void` | Limpia el valor y enfoca el campo |

## Comportamiento

### Validación de Entrada

1. **Solo números**: Filtra automáticamente caracteres no numéricos
2. **Longitud máxima**: Limita la entrada a 8 dígitos
3. **Prefijo obligatorio**: Debe comenzar con "89"
4. **Validación progresiva**: Si no empieza con "89", limita a 2 dígitos

### Estados de Validación

- **Entrada vacía**: Sin validación
- **Prefijo incorrecto**: Muestra error "La matrícula debe comenzar por 89"
- **Validando**: Muestra indicador de carga
- **Material encontrado**: Ejecuta `onChange` con descripción
- **Material no encontrado**: Ejecuta `onMaterialNotFound`

### Autocompletado

- Se activa cuando la matrícula tiene exactamente 8 dígitos y empieza con "89"
- Incluye un delay de 500ms para evitar múltiples consultas (cambiado a 1000ms)
- Consulta la función `getMaterialByRegistration` para obtener datos del material

## Estilos

### Estados Visuales

- **Normal**: Borde gris (`#4C4C4C`)
- **Enfocado**: Borde morado (`#91268F`)
- **Error**: Borde y texto rojo
- **Validando**: Spinner animado en la esquina derecha

### Clases CSS Principales

```css
.border-[#4C4C4C]        /* Borde normal */
.focus:border-[#91268F]  /* Borde enfocado */
.border-red-500          /* Borde de error */
.text-red-500            /* Texto de error */
```

## Ejemplo de Uso

```tsx
import { useRef } from 'react';
import MaterialAutocompleteInput, { MaterialAutocompleteInputRef } from './MaterialAutocompleteInput';

function MyComponent() {
  const [registration, setRegistration] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<MaterialAutocompleteInputRef>(null);

  const handleMaterialChange = (reg: string, desc?: string) => {
    setRegistration(reg);
    if (desc) {
      setDescription(desc);
    }
  };

  const handleMaterialNotFound = (reg: string) => {
    setDescription('');
    console.log(`Material ${reg} no encontrado`);
  };

  const clearInput = () => {
    inputRef.current?.clear();
    setDescription('');
  };

  return (
    <div>
      <MaterialAutocompleteInput
        ref={inputRef}
        value={registration}
        onChange={handleMaterialChange}
        onMaterialNotFound={handleMaterialNotFound}
        placeholder="Ingrese matrícula (89xxxxxx)"
        className="mb-4"
      />
      
      {description && (
        <div className="text-sm text-gray-600">
          Descripción: {description}
        </div>
      )}
      
      <button onClick={clearInput}>
        Limpiar
      </button>
    </div>
  );
}
```

## Dependencias

- `react` - Hooks básicos (useState, useEffect, useRef, forwardRef, useImperativeHandle)
- `@/components/ui/input` - Componente base de entrada
- `lucide-react` - Icono AlertCircle
- `@/lib/data` - Función getMaterialByRegistration

## Notas Técnicas

- El componente utiliza `forwardRef` para exponer métodos imperativos
- La validación incluye debouncing para optimizar las consultas a la API
- Los errores se manejan silenciosamente en la consola sin afectar la UI
- El cleanup de timeouts previene memory leaks al desmontar el componente