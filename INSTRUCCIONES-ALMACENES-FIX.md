# 🔧 Solución: Mostrar Almacenes en el Modal "Gestionar Ámbitos"

## 📋 Problema Identificado

Los almacenes no se mostraban en el modal "Gestionar Ámbitos" del Panel de Control debido a que la tabla `tbl_almacenes` tenía **Row Level Security (RLS)** habilitado sin políticas que permitieran a los usuarios autenticados leer los datos.

## ✅ Solución Implementada

### 1. Mejoras en el Código (Ya aplicadas)

- ✅ **Mejorado el manejo de errores** en `fetchAlmacenes()`: Ahora muestra un toast de notificación cuando falla la carga
- ✅ **Agregado logging**: Se registra en consola cuando los almacenes se cargan correctamente
- ✅ **Mejor diagnóstico**: El mensaje de error incluye detalles específicos del problema

📁 Archivo modificado: [src/pages/PanelDeControl.tsx](src/pages/PanelDeControl.tsx#L107-L134)

### 2. Políticas RLS para `tbl_almacenes` (Requiere aplicación manual)

Se han creado dos archivos SQL con las políticas necesarias:

#### Archivos creados:
- 📄 `supabase/migrations/20251014000000_add_tbl_almacenes_rls.sql` - Migración formal
- 📄 `apply-almacenes-rls.sql` - Script standalone para aplicación rápida

## 🚀 Pasos para Aplicar la Solución

### Opción 1: Aplicar desde Supabase Dashboard (Recomendado)

1. **Abre el SQL Editor de Supabase**:
   - Ve a: https://mlisnngduwrlqxyjjibp.supabase.co/project/_/sql
   - O navega a: Dashboard → SQL Editor

2. **Copia el contenido del script**:
   - Abre el archivo: `apply-almacenes-rls.sql`
   - Copia todo el contenido

3. **Ejecuta el script**:
   - Pega el contenido en el SQL Editor
   - Haz clic en "Run" o presiona `Ctrl + Enter`
   - Verifica que la ejecución termine sin errores

4. **Verifica las políticas creadas**:
   - Deberías ver 2 filas en los resultados:
     - ✅ "Usuarios autenticados pueden ver almacenes" (SELECT)
     - ✅ "Administradores pueden gestionar almacenes" (ALL)

### Opción 2: Aplicar con Supabase CLI (Si tienes el CLI configurado)

```bash
# Asegúrate de estar en la raíz del proyecto
cd c:\Users\Usuario\Documents\GitHub\mat89

# Vincula el proyecto (solo la primera vez)
npx supabase link --project-ref mlisnngduwrlqxyjjibp

# Aplica todas las migraciones pendientes
npx supabase db push
```

## 🧪 Verificación de la Solución

Una vez aplicada la migración SQL:

1. **Recarga la aplicación** en el navegador (F5)
2. **Inicia sesión** con tu usuario administrador
3. **Ve al Panel de Control** de usuarios
4. **Haz clic en el botón "Ámbito"** de cualquier usuario
5. **Verifica** que ahora se muestren los almacenes disponibles

### Comportamiento esperado:

- ✅ Se muestra la lista de almacenes con sus nombres y códigos
- ✅ Puedes marcar/desmarcar checkboxes para seleccionar almacenes
- ✅ El contador muestra "X almacenes" correctamente
- ✅ Los cambios se guardan al hacer clic en "Guardar Cambios"

### Si algo falla:

1. **Abre la consola del navegador** (F12)
2. **Busca mensajes de error** relacionados con almacenes
3. **Verifica** que aparezca el mensaje: "Almacenes cargados correctamente: X"
4. **Si ves un toast de error**, revisa que:
   - Las políticas RLS se aplicaron correctamente
   - El usuario tiene una sesión activa
   - La tabla `tbl_almacenes` tiene datos

## 📊 Detalles Técnicos

### Políticas RLS Creadas

#### Política 1: Lectura para todos los usuarios
```sql
CREATE POLICY "Usuarios autenticados pueden ver almacenes"
  ON tbl_almacenes
  FOR SELECT
  TO authenticated
  USING (true);
```
- Permite que **todos los usuarios autenticados** lean los almacenes
- Necesario para que aparezcan en el modal de gestión de ámbitos

#### Política 2: Gestión solo para administradores
```sql
CREATE POLICY "Administradores pueden gestionar almacenes"
  ON tbl_almacenes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.user_role = 'ADMINISTRADOR'
      AND user_profiles.status = 'ACTIVO'
    )
  );
```
- Solo usuarios con rol **ADMINISTRADOR** y estado **ACTIVO** pueden:
  - Crear nuevos almacenes (INSERT)
  - Modificar almacenes (UPDATE)
  - Eliminar almacenes (DELETE)

## 📝 Notas Adicionales

- Los almacenes son **datos de catálogo** que todos los usuarios necesitan ver
- Las políticas RLS garantizan que solo administradores puedan modificarlos
- El cambio es **retrocompatible** y no afecta funcionalidades existentes
- Si no hay almacenes en la base de datos, el modal mostrará: "No hay almacenes disponibles"

## ❓ Preguntas Frecuentes

**P: ¿Por qué todos los usuarios pueden ver los almacenes?**
R: Los almacenes son necesarios para la gestión de ámbitos. Los usuarios necesitan verlos para entender qué almacenes tienen asignados.

**P: ¿Pueden los usuarios no-admin crear almacenes?**
R: No, solo los administradores activos pueden crear, modificar o eliminar almacenes.

**P: ¿Qué pasa si no aplico la migración SQL?**
R: Los almacenes seguirán sin mostrarse en el modal, pero ahora verás un toast de error indicando el problema específico.

---

**Fecha de implementación**: 2025-10-14
**Archivos modificados**:
- ✏️ [src/pages/PanelDeControl.tsx](src/pages/PanelDeControl.tsx) (Código mejorado)
- ➕ `supabase/migrations/20251014000000_add_tbl_almacenes_rls.sql` (Nueva migración)
- ➕ `apply-almacenes-rls.sql` (Script de aplicación rápida)