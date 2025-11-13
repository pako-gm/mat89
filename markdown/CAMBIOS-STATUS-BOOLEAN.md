# Cambios en el Campo STATUS - Migración a Boolean

## 📋 Resumen de Cambios

Se ha simplificado el campo **STATUS** en la tabla `user_profiles` de tres opciones a dos opciones, cambiando el tipo de dato de `TEXT` a `BOOLEAN`.

### Antes (TEXT)
- `'ACTIVO'` - Usuario activo
- `'INACTIVO'` - Usuario inactivo
- `'PENDIENTE'` - Usuario pendiente de aprobación

### Después (BOOLEAN)
- `true` - Usuario ACTIVO
- `false` - Usuario INACTIVO

---

## 🗂️ Archivos Modificados

### 1. **Base de Datos**
- ✅ [supabase/migrations/20251101000000_change_status_to_boolean.sql](supabase/migrations/20251101000000_change_status_to_boolean.sql)
  - Migración automática que convierte el campo STATUS de TEXT a BOOLEAN
  - Migra datos existentes: 'ACTIVO' → true, otros → false
  - Actualiza políticas RLS para usar `status = true` en lugar de `status = 'ACTIVO'`

### 2. **Backend**
- ✅ [src/lib/auth.ts](src/lib/auth.ts#L105-L144)
  - Nueva función `checkUserStatus()` que verifica si el usuario está activo
  - Retorna `{ isActive: boolean, userEmail?: string, error?: string }`
  - Se ejecuta durante el login para validar el acceso

### 3. **Frontend**

#### [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx#L45-L65)
- ✅ Validación del status ANTES de permitir el acceso
- ✅ Si el usuario está INACTIVO (`status = false`):
  - Se cierra la sesión automáticamente
  - Se muestra el mensaje: **"El usuario [email] no está autorizado para acceder a la aplicación. Póngase en contacto con el Administrador del sitio para más información."**
  - El mensaje se muestra durante 10 segundos

#### [src/pages/PanelDeControl.tsx](src/pages/PanelDeControl.tsx)
- ✅ Actualizada la interface `UserProfile` para usar `status: boolean`
- ✅ Función `getStatusColor()` simplificada
- ✅ Dropdown de estado en la tabla ahora solo muestra ACTIVO/INACTIVO
- ✅ Filtro de estado actualizado para usar valores booleanos
- ✅ Modal de agregar usuario actualizado

---

## 🔄 Migración de Datos

La migración automática realiza los siguientes pasos:

```sql
-- 1. Crea columna temporal
ALTER TABLE user_profiles ADD COLUMN status_new BOOLEAN;

-- 2. Migra los datos
UPDATE user_profiles
SET status_new = CASE
  WHEN UPPER(status) = 'ACTIVO' THEN true
  ELSE false
END;

-- 3. Establece constraints
ALTER TABLE user_profiles
  ALTER COLUMN status_new SET NOT NULL,
  ALTER COLUMN status_new SET DEFAULT false;

-- 4. Elimina columna antigua y renombra
ALTER TABLE user_profiles DROP COLUMN status;
ALTER TABLE user_profiles RENAME COLUMN status_new TO status;
```

---

## 🚀 Instrucciones de Despliegue

### ✅ MIGRACIÓN COMPLETADA

La migración se ha ejecutado exitosamente usando el script de recuperación:
- [SQL/fix-status-migration-error.sql](SQL/fix-status-migration-error.sql)

**Estado actual:**
- ✅ Campo `status` cambiado de TEXT a BOOLEAN
- ✅ Políticas RLS actualizadas correctamente
- ✅ Índice recreado
- ✅ Sistema listo para usar

### Paso 1: Verificar la Migración (OPCIONAL)
```bash
# Ejecutar script de verificación en SQL Editor
# SQL/verify-status-migration.sql
```

### Paso 2: Verificar Usuarios Activos
```sql
-- Ver el estado de todos los usuarios
SELECT
  email,
  user_role,
  status,
  CASE
    WHEN status = true THEN '✅ ACTIVO'
    WHEN status = false THEN '❌ INACTIVO'
  END as estado_legible
FROM user_profiles
ORDER BY user_role DESC, email;
```

### Paso 3: Activar Administradores (si es necesario)
```sql
-- Asegurar que todos los administradores estén activos
UPDATE user_profiles
SET status = true
WHERE user_role = 'ADMINISTRADOR';
```

---

## 🧪 Pruebas Requeridas

### 1. Prueba de Login con Usuario ACTIVO
1. Crear o usar un usuario con `status = true`
2. Intentar iniciar sesión
3. ✅ Debe permitir el acceso y redireccionar correctamente

### 2. Prueba de Login con Usuario INACTIVO
1. Crear o cambiar un usuario a `status = false`
2. Intentar iniciar sesión con ese usuario
3. ✅ Debe:
   - Cerrar la sesión automáticamente
   - Mostrar el mensaje: "El usuario [email] no está autorizado..."
   - NO permitir el acceso a la aplicación

### 3. Prueba del Panel de Control
1. Iniciar sesión como ADMINISTRADOR
2. Ir al Panel de Control
3. ✅ Verificar que:
   - El dropdown de estado solo muestra ACTIVO/INACTIVO
   - Se puede cambiar el estado de usuarios
   - Los colores se muestran correctamente (verde=ACTIVO, rojo=INACTIVO)
   - El filtro de estado funciona correctamente

---

## 📊 Políticas RLS Actualizadas

Las siguientes políticas se actualizaron para usar `status = true`:

```sql
-- Política para Administradores
CREATE POLICY "Administradores pueden gestionar almacenes"
  ON tbl_almacenes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = true  -- ← Cambiado de 'ACTIVO' a true
    )
  );

-- Similar para otras políticas...
```

---

## 🔧 Scripts de Ayuda

### [SQL/update-user-status-to-boolean.sql](SQL/update-user-status-to-boolean.sql)
Script para ajustes manuales post-migración:
- Activar administradores
- Ver el estado de todos los usuarios
- Consultas útiles

---

## ⚠️ Notas Importantes

1. **Valor por defecto**: El valor por defecto para nuevos usuarios es `false` (INACTIVO)
   - Los administradores deben activar manualmente a los nuevos usuarios

2. **Usuarios existentes con 'PENDIENTE'**: Se convierten automáticamente a `false` (INACTIVO)

3. **Backend validation**: La validación del status se realiza en el backend durante el login, garantizando seguridad

4. **Compatibilidad**: Los scripts SQL antiguos que usan `status = 'ACTIVO'` dejarán de funcionar y deben actualizarse

---

## 📞 Soporte

Si encuentras algún problema durante la migración:
1. Verifica que la migración se ejecutó correctamente
2. Revisa los logs de Supabase
3. Consulta este documento para instrucciones específicas

---

**Fecha de implementación**: 2025-11-01
**Versión**: 1.0
