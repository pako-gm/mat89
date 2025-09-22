# Componente Sidebar

## Descripción General
El componente Sidebar es una barra lateral de navegación desarrollada en React que proporciona acceso a diferentes secciones de una aplicación de gestión de materiales. Incluye autenticación de usuarios, control de roles y navegación dinámica.

## Características Principales

### 1. Control de Acceso Basado en Roles
- **Roles soportados**: `ADMINISTRADOR`  `EDICION` `CONSULTAS`
- **Navegación condicional**: Los elementos del menú se muestran según el rol del usuario
- **Usuarios sin privilegios**: Solo pueden acceder a la sección "Consultar"

### 2. Elementos de Navegación

#### Para usuarios con roles privilegiados (ADMINISTRADOR/EDICION):
- **Pedidos** (`/pedidos`) - Gestión de pedidos con icono ClipboardList
- **Recepciones** (`/recepciones`) - Control de recepciones con icono PackageCheck  
- **Proveedores** (`/proveedores`) - Administración de proveedores con icono Factory
- **Materiales** (`/materiales`) - Catálogo de materiales con icono Package
- **Ver Datos Capturados** (`/datos-capturados`) - Visualización de datos (actualmente deshabilitado)

#### Para todos los usuarios:
- **Consultar** (`/consultar`) - Consulta de información con icono FileSearch

### 3. Información del Usuario
- **Avatar**: Imagen generada aleatoriamente desde CDN
- **Nombre**: Obtenido de la tabla `user_profiles` o derivado del email
- **Email**: Mostrado debajo del nombre
- **Estados de carga**: Indicador "Cargando..." mientras se obtienen los datos

## Dependencias

### Bibliotecas Externas
```javascript
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getUserRole } from "@/lib/auth";
```

### Componentes UI
```javascript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
```

### Iconos (Lucide React)
```javascript
import { 
  ClipboardList, 
  PackageCheck, 
  Factory, 
  Package, 
  FileSearch, 
  Database 
} from "lucide-react";
```

## Estructura de Componentes

### SidebarItem
Componente interno que renderiza cada elemento de navegación:

**Props:**
- `icon`: Elemento React (icono)
- `label`: Texto del enlace
- `path`: Ruta de destino
- `active`: Estado activo del enlace
- `disabled`: Estado deshabilitado

## Funcionalidades Técnicas

### Gestión de Estado
```javascript
const [userEmail, setUserEmail] = useState<string>("");
const [userName, setUserName] = useState<string>("");
const [avatarUrl, setAvatarUrl] = useState<string>("");
const [userRole, setUserRole] = useState<string | null>(null);
```

### Obtención de Datos de Usuario
- Autentica usuario actual via Supabase
- Consulta perfil en tabla `user_profiles`
- Maneja fallbacks para nombres de usuario
- Obtiene rol del usuario para control de acceso

### Avatar Dinámico
- Genera URL aleatoria: `https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-{1-16}.png`
- Implementa fallback con inicial del usuario

## Diseño Visual

### Estructura Layout
```
┌─────────────────┐
│     Mat89       │ ← Logo/Título
├─────────────────┤
│  📋 Pedidos     │
│  📦 Recepciones │ ← Navegación
│  🏭 Proveedores │   (condicional)
│  📦 Materiales  │
│  🔍 Consultar   │
├─────────────────┤
│     Avatar      │
│   Nombre User   │ ← Info Usuario
│  email@test.com │
└─────────────────┘
```

### Estilos
- **Contenedor**: Fondo blanco con borde derecho
- **Items activos**: Fondo gris claro
- **Items deshabilitados**: Texto gris con opacidad reducida
- **Hover**: Transición suave a fondo gris claro

## Base de Datos

### Tablas Utilizadas
- `user_profiles`: Almacena información extendida del usuario
  - Campo `nombre_usuario`: Nombre personalizado del usuario
  - Campo `id`: Vinculado con el ID de autenticación

### Consultas
```sql
-- Obtención del perfil de usuario
SELECT nombre_usuario 
FROM user_profiles 
WHERE id = user.id
```

## Manejo de Errores
- Captura errores de autenticación
- Maneja casos donde no existe perfil de usuario
- Implementa fallbacks para datos faltantes
- Log de errores en consola para debugging

## Casos de Uso

1. **Usuario Administrador**: Acceso completo a todas las secciones
2. **Usuario Edición**: Acceso a gestión pero sin ciertos privilegios
3. **Usuario Consulta**: Solo puede consultar información
4. **Usuario No Autenticado**: Redirección o acceso limitado

## Mejoras Potenciales
- Implementar tooltips para items deshabilitados
- Añadir indicadores de notificaciones
- Mejorar manejo de estados de carga
- Implementar cache para datos de usuario
- Añadir animaciones de transición entre secciones