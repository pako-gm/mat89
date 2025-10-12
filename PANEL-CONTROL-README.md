# Panel de Control de Usuarios - Documentación

## 📋 Resumen

Se ha implementado un panel de control completo para la gestión de usuarios en la aplicación Mat89. Este panel permite a los administradores gestionar usuarios, roles, estados y ámbitos de acceso.

## ✨ Funcionalidades Implementadas

### 1. **Alta de Usuarios**
- Formulario modal para crear nuevos usuarios
- Campos: nombre completo, email, contraseña, rol, estado inicial
- Validación de campos obligatorios
- Creación automática en Supabase Auth y `user_profiles`

### 2. **Baja de Usuarios**
- Botón de eliminar en cada fila de usuario
- Confirmación antes de eliminar
- Protección: no permite eliminarse a sí mismo
- Actualización automática de la lista tras eliminar

### 3. **Cambio de Estado**
- Dropdown inline en la tabla
- Tres estados: **Activo**, **Inactivo**, **Pendiente**
- Colores distintivos:
  - 🟢 Verde: Activo
  - 🔴 Rojo: Inactivo
  - ⚪ Gris: Pendiente
- Actualización en tiempo real

### 4. **Asignación de Roles**
- Dropdown inline en la tabla
- Tres roles disponibles:
  - **ADMINISTRADOR**: Acceso completo + panel de control
  - **EDICION**: Acceso CRUD sin gestión de usuarios
  - **CONSULTAS**: Solo lectura
- Protección: administrador no puede quitarse su propio rol

### 5. **Gestión de Ámbitos**
- Modal para asignar almacenes visibles a cada usuario
- Checkboxes para selección múltiple
- Contador de almacenes asignados en la tabla
- Almacenamiento en campo `ambito_almacenes` (array)

### 6. **Búsqueda y Filtrado**
- Búsqueda por nombre o email
- Filtrado en tiempo real
- Barra de búsqueda con icono

### 7. **Paginación Completa**
- Selector de filas por página (5, 10, 25, 50)
- Navegación: Primera, Anterior, Siguiente, Última
- Números de página
- Indicador de rango (ej. "1-10 de 45")

### 8. **Edición de Usuarios**
- Modal para editar nombre de usuario
- Email no editable (protección)
- Actualización en tiempo real

### 9. **Seguridad y Protección**
- Ruta protegida solo para `ADMINISTRADOR`
- Componente `ProtectedRoute` con verificación de rol
- Redirección automática si no tiene permisos
- Toasts informativos

## 📁 Archivos Creados/Modificados

### Archivos Nuevos

1. **`src/pages/PanelDeControl.tsx`** (1,300+ líneas)
   - Componente principal del panel de control
   - Todas las funcionalidades CRUD integradas
   - Modales de alta, edición y gestión de ámbitos
   - Sistema de paginación completo

2. **`src/components/ProtectedRoute.tsx`** (75 líneas)
   - HOC para proteger rutas por rol
   - Verificación de autenticación y autorización
   - Loading state mientras verifica
   - Redirección automática

3. **`PANEL-CONTROL-README.md`** (este archivo)
   - Documentación completa del panel
   - Instrucciones de configuración de base de datos
   - Guía de uso

### Archivos Modificados

1. **`src/App.tsx`**
   - Importación de `PanelDeControl` y `ProtectedRoute`
   - Nueva ruta `/panel-control` protegida

2. **`src/components/layout/Sidebar.tsx`**
   - Importación de icono `Settings`
   - Botón "Panel de Control" visible solo para administradores

3. **`src/lib/auth.ts`**
   - Corrección de campos de base de datos:
     - `role` → `user_role`
     - `id` → `user_id`
   - Funciones actualizadas: `hasRole`, `hasAnyRole`, `getUserRole`

## 🗄️ Configuración de Base de Datos (Supabase)

### 1. Verificar Tabla `user_profiles`

La tabla debe tener los siguientes campos:

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'CONSULTAS',
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  ambito_almacenes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos importantes:**
- `user_id`: Referencia al usuario de Supabase Auth
- `user_role`: Rol del usuario (ADMINISTRADOR | EDICION | CONSULTAS)
- `status`: Estado del usuario (ACTIVO | INACTIVO | PENDIENTE)
- `ambito_almacenes`: Array de IDs de almacenes visibles

### 2. Habilitar Row Level Security (RLS)

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### 3. Crear Policies de Seguridad

#### a) Lectura (SELECT) - Solo Administradores

```sql
CREATE POLICY "Admin can read all users"
ON user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  )
);
```

#### b) Inserción (INSERT) - Solo Administradores

```sql
CREATE POLICY "Admin can insert users"
ON user_profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  )
);
```

#### c) Actualización (UPDATE) - Solo Administradores

```sql
CREATE POLICY "Admin can update users"
ON user_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  )
);
```

#### d) Eliminación (DELETE) - Solo Administradores

```sql
CREATE POLICY "Admin can delete users"
ON user_profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  )
);
```

### 4. Policy para Auto-lectura (Usuarios leen su propio perfil)

```sql
CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
USING (user_id = auth.uid());
```

### 5. Índices Recomendados

```sql
-- Índice en user_id para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
ON user_profiles(user_id);

-- Índice en user_role para filtrado por rol
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role
ON user_profiles(user_role);

-- Índice en status para filtrado por estado
CREATE INDEX IF NOT EXISTS idx_user_profiles_status
ON user_profiles(status);
```

## 🎨 Diseño Visual

### Colores

- **Primario**: `#91268F` (morado corporativo)
- **Primario Hover**: `#7A1F79` (morado oscuro)
- **Activo**: `bg-green-500` (verde)
- **Inactivo**: `bg-red-500` (rojo)
- **Pendiente**: `bg-gray-400` (gris)

### Componentes UI

- **Tablas**: Hover en filas, bordes suaves
- **Modales**: Fondo con overlay, bordes redondeados (rounded-2xl)
- **Botones**: Transiciones suaves, sombras
- **Inputs**: Focus ring morado
- **Avatares**: Fondo gris oscuro con iniciales

## 🚀 Acceso al Panel

### Como Usuario Administrador

1. Iniciar sesión con credenciales de administrador
2. En el Sidebar, buscar el botón **"Panel de Control"** (icono de engranaje)
3. Click en "Panel de Control"
4. El panel se abre mostrando todos los usuarios

### Como Usuario No-Administrador

- El botón **NO será visible** en el Sidebar
- Si se intenta acceder directamente vía URL (`/panel-control`):
  - Se muestra toast: "No tienes permisos para acceder a esta página"
  - Redirección automática a `/pedidos`

## 📖 Guía de Uso

### Agregar Usuario

1. Click en botón **"Agregar Usuario"** (esquina superior izquierda)
2. Completar formulario:
   - Nombre completo (opcional)
   - Email (requerido)
   - Contraseña (requerido, mínimo 6 caracteres)
   - Rol (selector)
   - Estado inicial (selector)
3. Click en **"Crear Usuario"**
4. Usuario aparece en la tabla

### Editar Usuario

1. Click en icono de lápiz (✏️) en la fila del usuario
2. Modal de edición se abre
3. Modificar nombre
4. Click en **"Guardar Cambios"**

### Cambiar Estado o Rol

- Directamente en la tabla, usar los selectores inline
- Los cambios se guardan automáticamente

### Gestionar Ámbitos (Almacenes)

1. Click en botón **"X almacenes"** en la columna Ámbito
2. Modal con lista de almacenes se abre
3. Marcar/desmarcar checkboxes
4. Click en **"Guardar Cambios"**

### Eliminar Usuario

1. Click en icono de papelera (🗑️) en la fila del usuario
2. Confirmar acción en el diálogo
3. Usuario eliminado permanentemente

**⚠️ Protecciones:**
- No puedes eliminarte a ti mismo
- No puedes quitarte el rol de administrador

### Buscar Usuarios

- Usar barra de búsqueda superior
- Escribe nombre o email
- Filtrado en tiempo real

### Paginación

- Selector de filas por página (parte inferior izquierda)
- Navegación con botones (parte inferior derecha)
- Indicador de rango actual

## 🔒 Seguridad Implementada

### Frontend

- ✅ Componente `ProtectedRoute` verifica rol antes de renderizar
- ✅ Botón en Sidebar solo visible para `ADMINISTRADOR`
- ✅ Verificación de permisos antes de eliminar/editar
- ✅ Protección contra auto-eliminación
- ✅ Protección contra auto-remoción de rol admin

### Backend (Supabase)

- ✅ Row Level Security (RLS) habilitado
- ✅ Policies para CRUD solo para administradores
- ✅ Referencias con CASCADE delete
- ✅ Validación a nivel de base de datos

## 🧪 Testing Recomendado

### Caso 1: Acceso Denegado
1. Iniciar sesión como usuario EDICION o CONSULTAS
2. Intentar acceder a `/panel-control` manualmente
3. **Esperado**: Redirección y toast de error

### Caso 2: Acceso Permitido
1. Iniciar sesión como ADMINISTRADOR
2. Navegar a Panel de Control desde Sidebar
3. **Esperado**: Visualización completa del panel

### Caso 3: CRUD Completo
1. Crear usuario → Verificar aparece en tabla
2. Editar usuario → Verificar cambios guardados
3. Cambiar rol → Verificar actualización
4. Cambiar estado → Verificar colores
5. Gestionar ámbitos → Verificar contador
6. Eliminar usuario → Verificar desaparece

### Caso 4: Protecciones
1. Intentar eliminar tu propio usuario → **Bloqueado**
2. Intentar quitar tu rol admin → **Bloqueado**

## 📦 Dependencias

El panel utiliza las siguientes dependencias ya instaladas:

- **React Router**: Navegación y rutas protegidas
- **Supabase**: Auth y base de datos
- **Lucide React**: Iconos
- **Tailwind CSS**: Estilos
- **shadcn/ui**: Componentes de toasts y avatares

## 🔧 Configuración Adicional (Opcional)

### Tabla de Almacenes

Si deseas usar una tabla específica de almacenes en lugar de `tbl_proveedores`:

1. Crear tabla:

```sql
CREATE TABLE almacenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Modificar en `PanelDeControl.tsx` línea ~110:

```typescript
const { data, error } = await supabase
  .from('almacenes') // Cambiar aquí
  .select('id, nombre, codigo')
  .order('nombre');
```

### Campos Adicionales en `user_profiles`

Si necesitas más campos:

```sql
ALTER TABLE user_profiles
ADD COLUMN telefono TEXT,
ADD COLUMN departamento TEXT,
ADD COLUMN fecha_ingreso DATE;
```

Luego actualizar el formulario en `PanelDeControl.tsx`.

## 🐛 Solución de Problemas

### "No se pudieron cargar los usuarios"

**Causa**: RLS mal configurado o usuario sin rol ADMINISTRADOR
**Solución**:
1. Verificar policies en Supabase
2. Asignar rol ADMINISTRADOR manualmente:

```sql
UPDATE user_profiles
SET user_role = 'ADMINISTRADOR'
WHERE email = 'tu-email@ejemplo.com';
```

### "No se puede crear usuario"

**Causa**: Permisos de Supabase Auth insuficientes
**Solución**:
- Usar `supabase.auth.admin.createUser()` requiere Service Role Key (servidor)
- El código actual usa `signUp()` que funciona con Anon Key

### Email no llega al nuevo usuario

**Causa**: Supabase requiere confirmación de email
**Solución**: En Supabase Dashboard → Authentication → Settings:
- Habilitar "Enable email confirmations"
- O deshabilitarlo para testing

## 📚 Recursos Adicionales

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [React Router Protected Routes](https://reactrouter.com/en/main/start/tutorial)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 👨‍💻 Soporte

Para dudas o problemas:
1. Verificar logs del navegador (F12 → Console)
2. Verificar policies en Supabase Dashboard
3. Revisar este README

---

**🚀 Implementado con éxito por Claude Code**

**Fecha**: Octubre 2025
**Versión**: 1.0.0
