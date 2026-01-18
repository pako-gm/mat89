# Implementación del Rol GESTORAPP

**Fecha:** 2026-01-18
**Versión:** 1.0
**Autor:** Claude Code

---

## Resumen

Se implementó un nuevo rol `GESTORAPP` como el nivel de privilegio más alto del sistema, por encima de `ADMINISTRADOR`. Este rol tiene acceso exclusivo a páginas críticas del sistema y solo puede existir un usuario con este rol.

---

## Jerarquía de Roles

```
GESTORAPP > ADMINISTRADOR > EDICION > CONSULTAS
```

---

## Cambios en Base de Datos

### 1. Nuevo valor ENUM
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'GESTORAPP' BEFORE 'ADMINISTRADOR';
```

### 2. Trigger de unicidad
Se creó un trigger `check_single_gestorapp()` que previene que más de un usuario tenga el rol GESTORAPP.

**Archivo:** `SQL/add-gestorapp-role.sql`

### 3. Función helper para RLS
Se creó una función con `SECURITY DEFINER` para evitar dependencias circulares en las políticas RLS:

```sql
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT user_role::text
  FROM user_profiles
  WHERE user_id = auth.uid()::uuid
  LIMIT 1;
$$;
```

### 4. Políticas RLS actualizadas
Se actualizaron las políticas de Row Level Security en `user_profiles` para permitir que GESTORAPP y ADMINISTRADOR puedan realizar operaciones CRUD.

**Archivo:** `SQL/update-rls-for-gestorapp.sql`

---

## Cambios en Frontend

### 1. src/lib/auth.ts

| Cambio | Descripción |
|--------|-------------|
| Línea 9 | Añadido `'GESTORAPP'` al tipo de rol en `_hasRole()` |
| Línea 43 | Añadido `'GESTORAPP'` al tipo de rol en `hasAnyRole()` |
| Líneas 146-153 | Nueva función `isGestorApp()` |

### 2. src/components/ProtectedRoute.tsx

| Cambio | Descripción |
|--------|-------------|
| Línea 10 | Nueva prop `allowedRoles?: string[]` |
| Líneas 41-60 | Lógica actualizada: GESTORAPP siempre tiene acceso |

```typescript
// GESTORAPP siempre tiene acceso a todo
if (userRole === 'GESTORAPP') {
  setHasPermission(true);
}
```

### 3. src/App.tsx

**Rutas solo para GESTORAPP:**
- `/versiones` → `allowedRoles={['GESTORAPP']}`
- `/auditoria-seguridad` → `allowedRoles={['GESTORAPP']}`
- `/backup-sistema` → `allowedRoles={['GESTORAPP']}`
- `/pruebas` → `allowedRoles={['GESTORAPP']}`

**Rutas para GESTORAPP y ADMINISTRADOR:**
- `/panel-control` → `allowedRoles={['GESTORAPP', 'ADMINISTRADOR']}`
- `/maestro-almacenes` → `allowedRoles={['GESTORAPP', 'ADMINISTRADOR']}`
- `/maestro-vehiculos` → `allowedRoles={['GESTORAPP', 'ADMINISTRADOR']}`

**Modo mantenimiento (línea 221):**
```typescript
if (maintenanceActive && session && !isRecoveryMode &&
    userRole !== 'ADMINISTRADOR' && userRole !== 'GESTORAPP')
```

### 4. src/components/layout/Sidebar.tsx

| Cambio | Descripción |
|--------|-------------|
| Línea 165 | Añadido `GESTORAPP` a condición de menú principal |
| Líneas 206-260 | Submenú condicional de Panel de Control |

**Opciones exclusivas GESTORAPP:**
- Auditoría de Seguridad
- Backup Datos Sistema
- Mantenimiento Sistema
- Versiones APP

**Opciones compartidas (GESTORAPP + ADMINISTRADOR):**
- Gestión de Usuarios
- Maestro de Almacenes
- Maestro de Vehículos

### 5. src/pages/PanelDeControl.tsx

| Función | Cambio |
|---------|--------|
| `filteredUsers` (228-232) | ADMINISTRADOR no ve usuarios GESTORAPP |
| `handleDeleteUser` (446-465) | Previene eliminación de GESTORAPP |
| `handleChangeStatus` (491-501) | ADMINISTRADOR no puede modificar GESTORAPP |
| `handleChangeRole` (515-545) | No se puede asignar GESTORAPP desde UI |
| Filtro de roles (665-667) | Solo GESTORAPP ve la opción en filtro |
| Select de rol en tabla (808-812) | Dropdown deshabilitado para GESTORAPP |
| Formulario nuevo usuario (1149-1158) | GESTORAPP no aparece como opción |

---

## Matriz de Permisos

| Página | Ruta | GESTORAPP | ADMIN | EDICION | CONSULTAS |
|--------|------|:---------:|:-----:|:-------:|:---------:|
| Auditoría de Seguridad | `/auditoria-seguridad` | ✅ | ❌ | ❌ | ❌ |
| Backup Datos Sistema | `/backup-sistema` | ✅ | ❌ | ❌ | ❌ |
| Mantenimiento Sistema | `/pruebas` | ✅ | ❌ | ❌ | ❌ |
| Versiones APP | `/versiones` | ✅ | ❌ | ❌ | ❌ |
| Panel de Control | `/panel-control` | ✅ | ✅ | ❌ | ❌ |
| Maestro Almacenes | `/maestro-almacenes` | ✅ | ✅ | ❌ | ❌ |
| Maestro Vehículos | `/maestro-vehiculos` | ✅ | ✅ | ❌ | ❌ |
| Pedidos | `/pedidos` | ✅ | ✅ | ✅ | ❌ |
| Recepciones | `/recepciones` | ✅ | ✅ | ✅ | ❌ |
| Proveedores | `/proveedores` | ✅ | ✅ | ✅ | ❌ |
| Materiales | `/materiales` | ✅ | ✅ | ✅ | ❌ |
| Consultar | `/consultar` | ✅ | ✅ | ✅ | ✅ |

---

## Restricciones de Seguridad

1. **Unicidad:** Solo puede existir 1 usuario GESTORAPP (enforced por trigger en BD)
2. **Asignación:** El rol GESTORAPP solo puede asignarse desde la base de datos
3. **Visibilidad:** ADMINISTRADOR no puede ver al usuario GESTORAPP en el Panel de Control
4. **Modificación:** ADMINISTRADOR no puede modificar estado/rol del GESTORAPP
5. **Eliminación:** GESTORAPP no puede ser eliminado desde la interfaz
6. **Auto-protección:** GESTORAPP no puede quitarse su propio rol

---

## Archivos Modificados

```
src/
├── lib/
│   └── auth.ts                    # Funciones de autenticación
├── components/
│   ├── ProtectedRoute.tsx         # Componente de rutas protegidas
│   └── layout/
│       └── Sidebar.tsx            # Menú lateral condicional
├── pages/
│   └── PanelDeControl.tsx         # Gestión de usuarios
└── App.tsx                        # Configuración de rutas

SQL/
├── add-gestorapp-role.sql         # Migración: ENUM + trigger
└── update-rls-for-gestorapp.sql   # Políticas RLS actualizadas
```

---

## Comandos SQL de Verificación

```sql
-- Verificar usuario GESTORAPP
SELECT email, user_role FROM user_profiles WHERE user_role = 'GESTORAPP';

-- Verificar que solo hay 1 GESTORAPP
SELECT COUNT(*) FROM user_profiles WHERE user_role = 'GESTORAPP';

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Probar función helper
SELECT public.get_current_user_role();
```

---

## Notas de Implementación

- La función `get_current_user_role()` usa `SECURITY DEFINER` para evitar dependencias circulares en RLS
- El campo `user_id` es de tipo `uuid`, por lo que se usa `auth.uid()::uuid` en las comparaciones
- GESTORAPP tiene bypass automático en modo mantenimiento
