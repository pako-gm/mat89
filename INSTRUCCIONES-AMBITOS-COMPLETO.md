# 🔧 Solución Completa: Gestión de Ámbitos en Panel de Control

## 📋 Problemas Identificados

Se identificaron **dos problemas principales** al intentar usar el modal "Gestionar Ámbitos":

### ❌ Problema 1: Almacenes no se mostraban
Los almacenes no aparecían en el modal porque la tabla `tbl_almacenes` tenía **Row Level Security (RLS)** habilitado sin políticas que permitieran a los usuarios autenticados leer los datos.

**Síntoma**: Modal vacío con mensaje "No hay almacenes disponibles" (aunque existan datos en la tabla).

### ❌ Problema 2: No se podían guardar los ámbitos
Al intentar guardar los ámbitos seleccionados, aparecía el error **"No se pudieron guardar los ámbitos"**.

**Causas posibles**:
- La columna `ambito_almacenes` no existe en la tabla `user_profiles`
- Las políticas RLS de `user_profiles` no permiten actualizaciones por administradores
- La función helper `is_admin()` no está configurada correctamente

## ✅ Solución Implementada

### 1. Mejoras en el Código (✅ Ya aplicadas)

#### Archivo: [src/pages/PanelDeControl.tsx](src/pages/PanelDeControl.tsx)

**Función `fetchAlmacenes()`** ([líneas 107-134](src/pages/PanelDeControl.tsx#L107-L134)):
- ✅ Mejor manejo de errores con toast de notificación
- ✅ Logging detallado en consola
- ✅ Mensajes de error descriptivos con detalles técnicos

**Función `handleSaveAmbitos()`** ([líneas 441-471](src/pages/PanelDeControl.tsx#L441-L471)):
- ✅ Logging de los datos que se intentan guardar
- ✅ Toast de error con mensaje técnico detallado
- ✅ Console.error con stack trace completo

### 2. Scripts SQL Creados (⚠️ Requieren aplicación manual)

Se han creado **tres archivos SQL** con diferentes propósitos:

| Archivo | Propósito | Cuándo usar |
|---------|-----------|-------------|
| `apply-almacenes-rls.sql` | Solo corrige RLS de `tbl_almacenes` | Si solo falla la visualización de almacenes |
| `supabase/migrations/20251014000000_add_tbl_almacenes_rls.sql` | Migración formal de RLS | Para aplicar via CLI o mantener historial |
| **`fix-ambitos-complete.sql`** ✨ | **Solución completa y verificación** | **RECOMENDADO: Corrige todo** |

## 🚀 Aplicar la Solución (PASO OBLIGATORIO)

### ⭐ Opción Recomendada: Script Completo

Este script corrige **ambos problemas** y verifica la configuración:

1. **Abre el SQL Editor de Supabase**:
   ```
   https://mlisnngduwrlqxyjjibp.supabase.co/project/_/sql
   ```

2. **Copia el contenido completo** del archivo:
   ```
   fix-ambitos-complete.sql
   ```

3. **Pega y ejecuta** en el SQL Editor:
   - Haz clic en "Run" o presiona `Ctrl + Enter`
   - El script se ejecuta en una transacción (BEGIN/COMMIT)
   - Si hay algún error, todo se revierte automáticamente

4. **Verifica los resultados** al final del script:
   - Deberías ver 4 bloques de resultados con verificaciones
   - Busca los mensajes ✅ en los logs

### Qué hace el script completo:

```sql
-- ✅ PARTE 1: Verificar y crear columna ambito_almacenes
--    - Crea la columna si no existe (tipo TEXT[])
--    - Valor por defecto: array vacío '{}'
--    - Agrega comentario descriptivo

-- ✅ PARTE 2: Configurar RLS para tbl_almacenes
--    - Habilita RLS
--    - Crea política SELECT para todos los autenticados
--    - Crea política ALL para administradores activos

-- ✅ PARTE 3: Verificar políticas de user_profiles
--    - Verifica que existe la función is_admin()
--    - Crea política UPDATE para administradores si no existe

-- ✅ PARTE 4: Verificaciones finales
--    - Muestra la columna ambito_almacenes
--    - Lista todas las políticas de tbl_almacenes
--    - Lista políticas UPDATE de user_profiles
--    - Verifica función is_admin()
```

## 🧪 Verificación de la Solución

Una vez aplicado el script SQL:

### Paso 1: Recarga la aplicación
- Presiona `F5` o `Ctrl + R` en el navegador
- Limpia caché si es necesario (`Ctrl + Shift + R`)

### Paso 2: Abre la consola del navegador
- Presiona `F12`
- Ve a la pestaña "Console"

### Paso 3: Navega al Panel de Control
- Inicia sesión como **administrador**
- Deberías ver en consola:
  ```
  Almacenes cargados correctamente: X
  ```

### Paso 4: Prueba visualizar almacenes
- Haz clic en el botón **"Ámbito"** (icono de engranaje) de cualquier usuario
- **Resultado esperado**:
  - ✅ Se muestra la lista de almacenes con nombres y códigos
  - ✅ Cada almacén tiene un checkbox funcional
  - ✅ No aparece toast de error

### Paso 5: Prueba guardar ámbitos
- Selecciona o deselecciona algunos almacenes
- Haz clic en **"Guardar Cambios"**
- **Resultado esperado**:
  - ✅ Aparece toast verde: "Ámbitos actualizados"
  - ✅ El contador de almacenes se actualiza correctamente
  - ✅ En consola: "Guardando ámbitos para usuario: ..."
  - ✅ El modal se cierra automáticamente

### ❌ Si algo falla:

#### Error al cargar almacenes:
1. Abre la consola (F12)
2. Busca el mensaje de error de `fetchAlmacenes`
3. Verifica en Supabase que las políticas de `tbl_almacenes` existen:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tbl_almacenes';
   ```

#### Error al guardar ámbitos:
1. Abre la consola (F12)
2. Busca el mensaje de error de `handleSaveAmbitos`
3. Verifica que la columna existe:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'user_profiles'
   AND column_name = 'ambito_almacenes';
   ```
4. Verifica tus permisos de administrador:
   ```sql
   SELECT user_role, status
   FROM user_profiles
   WHERE user_id = auth.uid();
   ```

## 📊 Detalles Técnicos

### Esquema de la solución:

```
┌─────────────────────────────────────────────────────┐
│ TABLA: tbl_almacenes                                │
├─────────────────────────────────────────────────────┤
│ Columnas:                                           │
│  - id (UUID, PK)                                    │
│  - codigo_alm (TEXT, NOT NULL)                     │
│  - nombre_alm (TEXT, NOT NULL)                     │
│  - ubicacion (TEXT)                                 │
│  - responsable (TEXT)                               │
│  - activo (BOOLEAN, DEFAULT true)                  │
├─────────────────────────────────────────────────────┤
│ Políticas RLS:                                      │
│  ✅ "Usuarios autenticados pueden ver almacenes"   │
│     FOR SELECT TO authenticated USING (true)       │
│  ✅ "Administradores pueden gestionar almacenes"   │
│     FOR ALL TO authenticated                        │
│     USING/WITH CHECK (is admin AND active)         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TABLA: user_profiles                                │
├─────────────────────────────────────────────────────┤
│ Columnas relevantes:                                │
│  - id (UUID, PK)                                    │
│  - user_id (UUID, FK → auth.users)                │
│  - user_role (TEXT)                                 │
│  - status (TEXT)                                    │
│  - ambito_almacenes (TEXT[], DEFAULT '{}') ← NUEVO │
├─────────────────────────────────────────────────────┤
│ Políticas RLS (para UPDATE):                       │
│  ✅ "Users can update own profile"                 │
│     FOR UPDATE USING (user_id = auth.uid())        │
│  ✅ "Admins can update all profiles"               │
│     FOR UPDATE USING (is_admin())                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ FUNCIÓN: is_admin()                                 │
├─────────────────────────────────────────────────────┤
│ Tipo: SECURITY DEFINER (evita recursión RLS)       │
│ Retorna: BOOLEAN                                    │
│ Lógica:                                             │
│  EXISTS (                                           │
│    SELECT 1 FROM user_profiles                      │
│    WHERE user_id = auth.uid()                       │
│    AND user_role = 'ADMINISTRADOR'                  │
│  )                                                  │
└─────────────────────────────────────────────────────┘
```

### Flujo de la funcionalidad:

```
┌──────────────────────────────────────────────────────────┐
│ 1. Usuario administrador abre Panel de Control          │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 2. useEffect inicial llama a:                            │
│    - fetchUsers()                                        │
│    - fetchCurrentUser()                                  │
│    - fetchAlmacenes() ← Lee tbl_almacenes con RLS       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Usuario hace clic en botón "Ámbito" (Settings icon)  │
│    - setSelectedUserAmbito(user)                         │
│    - setShowAmbitoModal(true)                            │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Modal muestra:                                        │
│    - Lista de almacenesDisponibles (desde fetchAlmacenes)│
│    - Checkboxes preseleccionados (user.ambito_almacenes) │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 5. Usuario selecciona/deselecciona almacenes            │
│    - Estado: almacenesSeleccionados (array de UUIDs)    │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 6. Usuario hace clic en "Guardar Cambios"               │
│    - handleSaveAmbitos()                                 │
│    - UPDATE user_profiles                                │
│      SET ambito_almacenes = $1                           │
│      WHERE id = $2                                       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 7. RLS verifica:                                         │
│    - ¿El usuario actual es admin? → is_admin()          │
│    - ¿La política "Admins can update all profiles" OK?  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 8. Si OK:                                                │
│    - UPDATE exitoso                                      │
│    - fetchUsers() refresca la lista                      │
│    - Toast verde: "Ámbitos actualizados"                │
│    - Modal se cierra                                     │
└──────────────────────────────────────────────────────────┘
```

## 📝 Archivos Modificados/Creados

### Código de la aplicación:
- ✏️ [src/pages/PanelDeControl.tsx](src/pages/PanelDeControl.tsx)
  - Mejorado manejo de errores en `fetchAlmacenes()`
  - Mejorado manejo de errores en `handleSaveAmbitos()`
  - Agregado logging detallado en consola

### Scripts SQL:
- ➕ `supabase/migrations/20251014000000_add_tbl_almacenes_rls.sql`
  - Migración formal de políticas RLS para `tbl_almacenes`

- ➕ `apply-almacenes-rls.sql`
  - Script standalone para aplicar solo RLS de almacenes

- ➕ **`fix-ambitos-complete.sql`** ⭐ **RECOMENDADO**
  - **Script completo que soluciona ambos problemas**
  - Verifica y crea columna `ambito_almacenes`
  - Configura RLS de `tbl_almacenes`
  - Verifica políticas de `user_profiles`
  - Verifica función `is_admin()`
  - Incluye verificaciones finales

### Documentación:
- ➕ `INSTRUCCIONES-ALMACENES-FIX.md` (versión inicial)
- ➕ **`INSTRUCCIONES-AMBITOS-COMPLETO.md`** (este archivo)

## ❓ Preguntas Frecuentes

**P: ¿Por qué todos los usuarios pueden ver los almacenes?**
R: Los almacenes son datos de catálogo necesarios para que los administradores puedan asignar ámbitos. Los usuarios normales los ven en el modal pero solo los administradores pueden modificar asignaciones.

**P: ¿Pueden los usuarios no-admin crear o modificar almacenes?**
R: No, solo los administradores con `status = 'ACTIVO'` pueden crear, modificar o eliminar almacenes en la tabla `tbl_almacenes`.

**P: ¿Pueden los usuarios no-admin modificar sus propios ámbitos?**
R: No, solo los administradores pueden modificar ámbitos de cualquier usuario. Los usuarios normales solo pueden leer su propio perfil.

**P: ¿Qué pasa si no aplico el script SQL?**
R: Los problemas persistirán:
- Los almacenes no se mostrarán en el modal
- Aparecerá un toast rojo con el error al intentar guardar
- La funcionalidad de ámbitos no será utilizable

**P: ¿Es seguro ejecutar el script múltiples veces?**
R: Sí, el script usa `IF NOT EXISTS` y `DROP POLICY IF EXISTS`, por lo que es idempotente y se puede ejecutar múltiples veces sin causar errores.

**P: ¿Afecta a datos existentes?**
R: No, el script solo crea estructura (columnas, políticas, funciones). Los datos existentes en `user_profiles` y `tbl_almacenes` no se modifican.

**P: ¿Necesito reiniciar el servidor de desarrollo?**
R: No, solo necesitas recargar la página en el navegador después de aplicar el script SQL.

## 🎯 Resumen Ejecutivo

| Aspecto | Detalle |
|---------|---------|
| **Problemas** | 1️⃣ Almacenes no visibles 2️⃣ No se pueden guardar ámbitos |
| **Causa raíz** | RLS sin políticas + Columna faltante/permisos |
| **Solución** | Script SQL completo + Código mejorado |
| **Tiempo estimado** | 5 minutos (copiar script + ejecutar + verificar) |
| **Complejidad** | Baja (solo copiar y pegar SQL) |
| **Riesgo** | Muy bajo (script con transacción y verificaciones) |
| **Impacto** | Alto (funcionalidad completa de gestión de ámbitos) |

---

**Fecha de implementación**: 2025-10-14
**Autor**: Claude (Asistente IA)
**Estado**: ✅ Listo para aplicar

¿Necesitas ayuda? Revisa la sección de verificación o contacta al equipo de desarrollo.