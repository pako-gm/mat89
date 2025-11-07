# Sistema de Versiones de la Aplicación

Este documento describe cómo configurar e implementar el sistema de historial de versiones de la aplicación Mat89.

## Instalación de la Base de Datos

### Paso 1: Ejecutar el Script SQL en Supabase

1. Accede a tu proyecto de Supabase
2. Ve a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido del archivo `create_app_versions_table.sql`
5. Ejecuta el script

El script creará:
- Tabla `tbl_app_versions` con todos los campos necesarios
- Índices para optimizar consultas
- Políticas RLS (Row Level Security):
  - Todos los usuarios pueden ver las versiones
  - Solo ADMINISTRADORES pueden crear, editar o eliminar versiones
- 10 versiones históricas basadas en el historial de commits del proyecto

### Paso 2: Verificar la Instalación

Ejecuta esta query para verificar que se crearon las versiones:

```sql
SELECT version_number, version_name, release_date
FROM tbl_app_versions
ORDER BY release_date DESC;
```

Deberías ver 10 versiones, desde la 1.0.0 hasta la 2.0.0.

## Estructura de la Tabla

```sql
tbl_app_versions
├── id (UUID) - Primary Key
├── version_number (VARCHAR) - Número de versión (ej: 2.0.0)
├── version_name (VARCHAR) - Nombre descriptivo
├── release_date (TIMESTAMP) - Fecha de lanzamiento
├── changes (TEXT[]) - Array de cambios principales
├── created_by (UUID) - Usuario que creó la versión
├── created_at (TIMESTAMP) - Fecha de creación del registro
└── updated_at (TIMESTAMP) - Fecha de última actualización
```

## Funcionalidades Implementadas

### 1. Modal de Historial de Versiones (Todos los usuarios)

- **Ubicación**: Botón "Versión e Historial" en la barra superior
- **Acceso**: Todos los perfiles (ADMINISTRADOR, EDICION, CONSULTAS)
- **Características**:
  - Muestra todas las versiones ordenadas de más reciente a más antigua
  - Auto-scrolling automático que se detiene al pasar el ratón
  - Diseño atractivo con gradientes y colores del sistema
  - La versión actual se resalta con badge "ACTUAL"

### 2. Página de Administración de Versiones (Solo ADMINISTRADOR)

- **Ubicación**: Menú lateral → "Versiones APP"
- **Acceso**: Solo perfil ADMINISTRADOR
- **Características**:
  - Crear nuevas versiones
  - Editar versiones existentes
  - Eliminar versiones (con confirmación)
  - Añadir múltiples cambios por versión
  - Validación de campos obligatorios

## Uso del Sistema

### Para Usuarios Normales

1. Haz clic en el botón "Versión e Historial" en la barra superior
2. Se abrirá un modal con todas las versiones
3. El contenido se desplazará automáticamente
4. Pasa el ratón sobre el contenido para pausar el scroll
5. Cierra el modal haciendo clic fuera o en la X

### Para Administradores

#### Crear una Nueva Versión

1. Ve a **Versiones APP** en el menú lateral
2. Haz clic en "Nueva Versión"
3. Completa los campos:
   - **Número de Versión**: ej. 2.1.0
   - **Nombre de la Versión**: ej. "Mejoras de Rendimiento"
   - **Fecha de Lanzamiento**: Selecciona la fecha
4. Añade cambios principales:
   - Haz clic en "Añadir Cambio"
   - Escribe cada cambio importante
   - Puedes añadir múltiples cambios
5. Haz clic en "Guardar"

#### Editar una Versión

1. En la lista de versiones, haz clic en el icono de edición (lápiz)
2. Modifica los campos necesarios
3. Haz clic en "Guardar"

#### Eliminar una Versión

1. Haz clic en el icono de eliminación (papelera)
2. Confirma la acción en el diálogo
3. La versión se eliminará permanentemente

## Archivos del Sistema

### Backend/Base de Datos
- `supabase/create_app_versions_table.sql` - Script SQL de creación

### Frontend
- `src/types/index.ts` - Interfaz TypeScript `AppVersion`
- `src/lib/data.ts` - Funciones CRUD para versiones:
  - `getAllVersions()` - Obtener todas las versiones
  - `getVersionById(id)` - Obtener versión específica
  - `saveVersion(version)` - Crear/actualizar versión
  - `deleteVersion(id)` - Eliminar versión

### Componentes
- `src/components/VersionHistoryModal.tsx` - Modal con autoscrolling
- `src/pages/VersionesPage.tsx` - Página de administración

### Rutas y Navegación
- `src/App.tsx` - Ruta `/versiones` protegida para ADMINISTRADOR
- `src/components/layout/Layout.tsx` - Botón de historial de versiones
- `src/components/layout/Sidebar.tsx` - Menú "Versiones APP"

## Versiones Históricas Incluidas

El script SQL incluye 10 versiones basadas en el historial real de commits:

1. **v1.0.0** - Versión Inicial (15 Ene 2024)
2. **v1.1.0** - Mejoras de Excel (20 Feb 2024)
3. **v1.2.0** - Optimización de Interfaz (10 Mar 2024)
4. **v1.3.0** - Mejoras de Usabilidad (5 Abr 2024)
5. **v1.4.0** - Gestión de Usuarios (15 May 2024)
6. **v1.5.0** - Documentación y Backups (1 Jun 2024)
7. **v1.6.0** - Mejoras de Búsqueda (10 Jul 2024)
8. **v1.7.0** - Optimización y Validaciones (20 Ago 2024)
9. **v1.8.0** - Despliegue Vercel (5 Sep 2024)
10. **v1.9.0** - Reset de Contraseña (1 Oct 2024)
11. **v2.0.0** - Actualización Mayor (6 Nov 2024) - ACTUAL

## Notas de Seguridad

- Las políticas RLS garantizan que solo ADMINISTRADORES puedan modificar versiones
- Todos los usuarios pueden visualizar el historial
- Las versiones eliminadas no se pueden recuperar
- Se registra quién creó cada versión (`created_by`)

## Soporte

Para cualquier problema o sugerencia, contacta con el equipo de desarrollo.
