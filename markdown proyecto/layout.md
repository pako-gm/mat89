# Desglose de Funciones - Layout.tsx

## 🏗️ **Componente Principal**

### `Layout()`
**Propósito**: Componente de diseño principal que envuelve toda la aplicación autenticada.
**Funcionalidad**: Proporciona la estructura base con sidebar, header con información de usuario y área de contenido principal.

---

## 📊 **Gestión de Estado (useState)**

### Estados del Componente
- `userRole`: Almacena el rol del usuario actual (string | null)
  - **Valores posibles**: Depende de la implementación del sistema de roles
  - **Estado inicial**: `null` (mientras se carga)
  - **Propósito**: Mostrar el rol del usuario en la interfaz

---

## 🔄 **Funciones de Efectos (useEffect)**

### `useEffect(() => { fetchUserRole(); }, [])`
**Propósito**: Ejecuta la carga del rol del usuario al montar el componente.
**Cuándo se ejecuta**: Una sola vez cuando el componente se monta.
**Dependencias**: Array vacío `[]` - solo se ejecuta en el montaje inicial.

---

## 🔐 **Funciones de Autenticación y Usuario**

### `fetchUserRole()` (función interna async)
**Propósito**: Obtiene el rol del usuario autenticado.
**Proceso**:
1. Llama al servicio `getUserRole()` desde `@/lib/auth`
2. Actualiza el estado `userRole` con la respuesta
**Tipo**: Función asíncrona anónima dentro del useEffect
**Manejo de errores**: No implementado explícitamente (confía en que `getUserRole()` maneje errores)

### `handleSignOut()` (función async)
**Propósito**: Gestiona el proceso completo de cierre de sesión del usuario.
**Proceso paso a paso**:
1. **Cierre de sesión**: Ejecuta `signOut()` desde el servicio de autenticación
2. **Notificación**: Muestra toast de confirmación al usuario
3. **Redirección**: Navega a la página de login (`/login`)
**Características**:
- **Asíncrona**: Espera a que se complete el cierre de sesión
- **Feedback visual**: Toast con mensaje de confirmación
- **Navegación automática**: Redirige sin intervención del usuario

---

## 🎯 **Hooks Utilizados**

### `useNavigate()` (React Router)
**Propósito**: Proporciona función de navegación programática.
**Uso**: Redirigir al usuario a `/login` después del cierre de sesión.
**Tipo**: Hook de React Router DOM

### `useToast()` (Hook personalizado)
**Propósito**: Proporciona sistema de notificaciones toast.
**Uso**: Mostrar mensaje de confirmación cuando se cierra sesión.
**Configuración del toast**:
- **Título**: "Sesión cerrada"
- **Descripción**: "Has cerrado sesión correctamente"
- **Tipo**: Éxito (por defecto)

---

## 🏗️ **Estructura del Layout**

### **Contenedor Principal**
```jsx
<div className="flex h-screen w-full">
```
**Propósito**: Contenedor raíz que ocupa toda la pantalla.
**Estilos**: Flexbox horizontal, altura completa de viewport, ancho completo.

### **Área del Sidebar**
```jsx
<div className="w-64">
  <Sidebar />
</div>
```
**Propósito**: Contenedor fijo para la barra lateral de navegación.
**Características**:
- **Ancho fijo**: 256px (w-64 en Tailwind)
- **Componente**: Renderiza el componente `Sidebar`
- **Posición**: Lado izquierdo del layout

### **Área de Contenido Principal**
```jsx
<div className="flex-1 overflow-auto">
```
**Propósito**: Contenedor flexible para el contenido principal.
**Características**:
- **Flexible**: Ocupa el espacio restante (flex-1)
- **Scroll**: Manejo automático de desbordamiento (overflow-auto)

---

## 📱 **Header/Barra Superior**

### **Contenedor del Header**
```jsx
<div className="flex justify-end items-center px-6 py-2 border-b">
```
**Propósito**: Barra superior con información de usuario y controles.
**Características**:
- **Alineación**: Contenido alineado a la derecha (justify-end)
- **Centrado vertical**: Elementos centrados verticalmente (items-center)
- **Espaciado**: Padding horizontal y vertical
- **Borde inferior**: Separación visual del contenido

### **Información del Usuario**
```jsx
{userRole && (
  <span className="text-sm text-gray-600">
    Rol: <span className="font-medium">{userRole}</span>
  </span>
)}
```
**Propósito**: Muestra el rol del usuario si está disponible.
**Renderizado condicional**: Solo se muestra si `userRole` no es null/undefined.
**Estilos**: Texto pequeño, color gris, rol resaltado en negrita.

### **Botón de Cierre de Sesión**
**Propósito**: Proporciona acceso rápido para cerrar sesión.
**Características**:
- **Variante**: Ghost (transparente con hover)
- **Tamaño**: Pequeño (sm)
- **Ícono**: LogOut de Lucide React
- **Texto**: "Cerrar sesión" en tamaño pequeño
- **Evento**: Ejecuta `handleSignOut()` al hacer clic

---

## 📄 **Área de Contenido**

### **Contenedor de Páginas**
```jsx
<div className="p-6 w-full">
  <Outlet />
</div>
```
**Propósito**: Área donde se renderizan las páginas/componentes hijos.
**Características**:
- **Outlet**: Punto de renderizado de React Router para rutas anidadas
- **Padding**: Espaciado uniforme de 24px (p-6)
- **Ancho completo**: w-full para ocupar todo el espacio disponible

---

## 🔗 **Dependencias y Servicios**

### **Servicios de Autenticación** (`@/lib/auth`)
- `getUserRole()`: Obtiene el rol del usuario autenticado
- `signOut()`: Cierra la sesión del usuario

### **Componentes UI**
- `Button`: Componente de botón de Shadcn/UI
- `Sidebar`: Componente personalizado de navegación lateral

### **Hooks y Utilidades**
- `useToast`: Hook personalizado para notificaciones
- `useNavigate`: Hook de React Router para navegación
- `Outlet`: Componente de React Router para renderizado de rutas anidadas

### **Iconos**
- `LogOut`: Ícono de Lucide React para el botón de cierre de sesión

---

## 🎨 **Características de Diseño**

### **Responsive Design**
- **Layout fijo**: Sidebar con ancho fijo, contenido flexible
- **Overflow handling**: Manejo automático de desbordamiento en el contenido
- **Full viewport**: Utiliza toda la altura de la ventana

### **Jerarquía Visual**
- **Separación clara**: Border entre header y contenido
- **Espaciado consistente**: Padding uniforme en las áreas
- **Alineación intuitiva**: Información de usuario alineada a la derecha

### **Estados de Interacción**
- **Botón hover**: Efecto visual en el botón de cierre de sesión
- **Feedback inmediato**: Toast de confirmación al cerrar sesión

---

## 🔒 **Flujo de Autenticación**

### **Carga Inicial**
1. Componente se monta
2. `useEffect` ejecuta `fetchUserRole()`
3. Se obtiene y muestra el rol del usuario

### **Cierre de Sesión**
1. Usuario hace clic en "Cerrar sesión"
2. Se ejecuta `handleSignOut()`
3. Se cierra la sesión en el backend
4. Se muestra notificación de confirmación
5. Se redirige a la página de login

---

## 🛠️ **Características Técnicas**

### **Gestión de Estado Mínima**
- Solo mantiene el estado necesario (rol del usuario)
- Estado local, no global (adecuado para este caso de uso)

### **Separación de Responsabilidades**
- **Layout**: Solo se encarga de la estructura visual
- **Autenticación**: Delegada a servicios especializados
- **Navegación**: Manejada por React Router
- **Notificaciones**: Delegadas al hook useToast

### **Manejo de Errores**
- **Implícito**: Confía en que los servicios manejen sus propios errores
- **Navegación segura**: Siempre redirige a login después del signOut

### **Performance**
- **Renders mínimos**: Solo re-renderiza cuando cambia el userRole
- **Efectos controlados**: useEffect con dependencias vacías para evitar re-ejecuciones