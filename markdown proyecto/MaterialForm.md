# Componente MaterialForm

## Descripción General
El componente `MaterialForm` es un formulario modal para crear y editar materiales en el sistema. Incluye validación de datos, verificación de duplicados y control de permisos de usuario.

## Props del Componente

### MaterialFormProps
```typescript
interface MaterialFormProps {
  open: boolean;           // Controla si el modal está abierto
  material: Material | null; // Material a editar (null para crear nuevo)
  onClose: () => void;     // Función para cerrar el modal
  onSave: () => void;      // Función ejecutada al guardar exitosamente
  isEditing: boolean;      // Indica si está en modo edición
}
```

## Estructura de Datos

### Material
```typescript
interface Material {
  id: string;
  registration: number;    // Matrícula (debe empezar por 89)
  description: string;     // Descripción del material
  vehicleSeries: string;   // Serie del vehículo
  infoAdicional: string;   // Información adicional opcional
  supplierId: string;      // ID del proveedor
  supplierName: string;    // Nombre del proveedor
}
```

## Características Principales

### 1. Validación de Matrícula
- **Formato requerido**: Debe comenzar por "89"
- **Longitud**: Exactamente 8 dígitos
- **Verificación de duplicados**: Consulta en tiempo real a la base de datos
- **Restricción de entrada**: Solo permite números

### 2. Series de Vehículo Disponibles
```javascript
const vehicleSeriesOptions = [
  "252", "310", "319", "333", "447", 
  "449", "470", "490", "592", "999"
];
```

### 3. Control de Autenticación
- Verifica sesión de usuario activa
- Valida permisos requeridos: `ADMINISTRADOR` o `EDICION`
- Muestra mensajes de error específicos para problemas de autenticación

## Estados del Componente

### 1. Estado del Formulario
```javascript
const [formData, setFormData] = useState<Material>({
  id: "",
  registration: 0,
  description: "",
  vehicleSeries: "",
  infoAdicional: "",
  supplierId: "",
  supplierName: ""
});
```

### 2. Estado de Validación de Matrícula
```javascript
const [registrationStatus, setRegistrationStatus] = useState({
  isValid: boolean,        // Si la matrícula es válida
  isDuplicate: boolean,    // Si ya existe en la BD
  isChecking: boolean,     // Si está verificando
  message: string,         // Mensaje de estado
  startsWithWrong: boolean // Si no empieza por 89
});
```

### 3. Estados Adicionales
- `loading`: Indica si está guardando
- `formErrors`: Errores de validación por campo
- `authError`: Errores de autenticación

## Funcionalidades Principales

### 1. Validación de Entrada
```javascript
const handleChange = (e) => {
  const { name, value } = e.target;
  
  if (name === "registration") {
    // Limpia caracteres no numéricos
    let cleanValue = value.replace(/\D/g, '');
    // Limita a 8 dígitos
    if (cleanValue.length > 8) {
      cleanValue = cleanValue.slice(0, 8);
    }
    // Previene entrada si no empieza por 89
    if (cleanValue.length > 2 && !cleanValue.startsWith('89')) {
      cleanValue = cleanValue.slice(0, 2);
    }
  }
};
```

### 2. Verificación de Duplicados
- **Debounce**: 500ms para evitar consultas excesivas (se ha aumentado a 2 seg.)
- **Exclusión**: En modo edición, excluye el material actual
- **Estados visuales**: Indicadores de carga y resultado

### 3. Validación del Formulario
```javascript
const validateForm = () => {
  const errors = {};
  
  // Validación de matrícula
  if (!formData.registration || formData.registration <= 0) {
    errors.registration = "La matrícula es obligatoria";
  } else if (registrationStatus.isDuplicate) {
    errors.registration = "Esta matrícula ya existe";
  }
  
  // Validación de descripción
  if (!formData.description.trim()) {
    errors.description = "La descripción es obligatoria";
  }
  
  return Object.keys(errors).length === 0;
};
```

## Interfaz de Usuario

### 1. Campos del Formulario
- **Matrícula**: Input numérico con validación en tiempo real
- **Serie Vehículo**: Select con opciones predefinidas
- **Descripción**: Input de texto (se convierte a mayúsculas)
- **Información Adicional**: Textarea opcional

### 2. Indicadores Visuales
- **Estados de error**: Bordes rojos y mensajes
- **Estados de éxito**: Bordes verdes y check
- **Estados de carga**: Spinners animados
- **Iconos**: AlertCircle y CheckCircle de Lucide React

### 3. Botones de Acción
- **Cancelar**: Cierra el modal sin guardar
- **Guardar/Actualizar**: Envía el formulario (deshabilitado durante validación)

## Dependencias

### Hooks de React
```javascript
import { useState, useEffect } from "react";
```

### Librerías Externas
```javascript
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
```

### Componentes UI
```javascript
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
```

### Funciones de Utilidad
```javascript
import { saveMaterial, checkMaterialRegistrationExists } from "@/lib/data";
import { hasAnyRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
```

## Flujo de Trabajo

### 1. Apertura del Formulario
1. Se reciben las props (material, isEditing, etc.)
2. Se inicializa formData con datos existentes o valores por defecto
3. Se resetean errores y estados de validación

### 2. Entrada de Datos
1. Usuario modifica campos
2. Se ejecuta validación en tiempo real
3. Para matrículas: verificación de duplicados con debounce

### 3. Envío del Formulario
1. Validación completa del formulario
2. Verificación de autenticación y permisos
3. Llamada a la función saveMaterial
4. Notificación de resultado y cierre del modal

## Casos de Error Comunes

### 1. Errores de Validación
- Matrícula vacía o incorrecta
- Descripción vacía
- Matrícula duplicada

### 2. Errores de Autenticación
- Usuario no autenticado
- Permisos insuficientes
- Sesión expirada

### 3. Errores de Base de Datos
- Problemas de conexión
- Errores de inserción/actualización
- Violaciones de restricciones

## Estilos y Tema

### 1. Colores Principales
- **Primario**: `#91268F` (botón guardar)
- **Hover**: `#7A1F79` (botón guardar hover)
- **Error**: Tonos rojos para validación
- **Éxito**: Tonos verdes para confirmación

### 2. Layout Responsivo
- **Ancho máximo**: 600px en pantallas medianas
- **Altura máxima**: 90vh con scroll
- **Grid**: 2 columnas para campos relacionados

## Consideraciones de Rendimiento

### 1. Debounce
- 500ms para verificación de duplicados
- Evita consultas excesivas a la base de datos

### 2. Cleanup de Efectos
- Limpieza de timeouts en useEffect
- Prevención de memory leaks

### 3. Estados de Carga
- Indicadores visuales durante operaciones
- Deshabilitación de botones durante procesos