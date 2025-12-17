# Fix: Error RLS en Backups Manuales

**Fecha**: 2025-12-17
**Problema**: Error 403 al ejecutar backup manual
**Estado**: ✅ SOLUCIÓN DISPONIBLE

CUESTION: HE COMPROBADO QUE LOS BACKUPS VIA GITHUB ACTIONS SOLAMENTE GUARDAN LA ESTRUCTURA DEL PROYECTO, PUES NO SE GUARDAN LOS DATOS EN GITHUB, ASI QUE VOY A IMPLEMENTAR UN GUARDADO DE LOS BACKUPS MANUAL Y AUTOMATICO EN LA CUENTA DE ferrotrastero@gmail.com EN UNA CARPETA ESPECIFICA.

---

## 📋 Diagnóstico del Problema

### Error Reportado
```
POST https://mlisnngduwrlqxyjjibp.supabase.co/rest/v1/tbl_backups_registro 403 (Forbidden)

Error guardando metadata de backup:
{
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "tbl_backups_registro"'
}
```

### Causa Raíz
1. **Contexto**: Se implementó un sistema de backup automático vía GitHub Actions
2. **Implementación**: El backup automático usa `service_role` key que BYPASSA las políticas RLS
3. **Problema**: Las políticas RLS de `tbl_backups_registro` NO permiten INSERT desde usuarios `authenticated`
4. **Resultado**: Los backups manuales (que usan sesión de usuario) fallan con error 403

### Cronología
- ✅ **ANTES**: Backups manuales funcionaban correctamente
- ⚙️ **IMPLEMENTACIÓN**: Sistema de backup automático vía GitHub Actions
- ❌ **AHORA**: Backups manuales fallan con error RLS

---

## 🔧 Solución

### Archivo SQL Creado
- **Ubicación**: `SQL/fix-backup-rls-policies.sql`
- **Función**: Corregir políticas RLS para permitir ambos tipos de backup

### Qué Hace el Script
1. **Limpia políticas antiguas**: Elimina todas las políticas RLS existentes en `tbl_backups_registro`
2. **Crea 3 nuevas políticas**:
   - ✅ **INSERT**: Permite a usuarios `authenticated` crear backups manuales
   - ✅ **SELECT**: Solo ADMINISTRADORES pueden ver backups
   - ✅ **DELETE**: Solo ADMINISTRADORES pueden eliminar backups
3. **Verifica la configuración**: Muestra las políticas creadas y estructura de tabla

### Compatibilidad
- ✅ **Backups Automáticos (GitHub Actions)**: Siguen funcionando con `service_role`
- ✅ **Backups Manuales (Usuarios)**: Ahora funcionarán con rol `authenticated`

---

## 🚀 Instrucciones de Ejecución

### Paso 1: Abrir Supabase Dashboard
1. Ir a: https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp
2. Login con tu cuenta

### Paso 2: SQL Editor
1. En el menú lateral, hacer clic en **"SQL Editor"**
2. Hacer clic en **"New query"**

### Paso 3: Ejecutar el Script
1. Abrir el archivo `SQL/fix-backup-rls-policies.sql`
2. Copiar TODO el contenido
3. Pegar en el SQL Editor de Supabase
4. Hacer clic en **"Run"** (o presionar Ctrl+Enter)

### Paso 4: Verificar Resultado
Deberías ver:
```
Success. No rows returned
```

Y en la sección de resultados:
- Tabla con 3 políticas creadas:
  - `authenticated_users_can_insert_backups`
  - `admins_can_view_all_backups`
  - `admins_can_delete_backups`

### Paso 5: Probar Backup Manual
1. Ir a tu aplicación en producción (Vercel)
2. Hacer clic en el botón de backup manual
3. Verificar que NO aparezca el error 403
4. Confirmar que el backup se creó exitosamente

---

## 🔍 Verificación Post-Fix

### Comandos SQL de Verificación
```sql
-- Ver políticas activas
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'tbl_backups_registro';

-- Ver registros de backup recientes
SELECT id, created_at, backup_type, user_id
FROM tbl_backups_registro
ORDER BY created_at DESC
LIMIT 10;
```

### Checklist
- [ ] Script ejecutado sin errores en Supabase
- [ ] 3 políticas RLS creadas correctamente
- [ ] Backup manual funciona desde producción
- [ ] Backup automático (GitHub Actions) sigue funcionando
- [ ] Solo administradores pueden ver listado de backups

---

## 📊 Diferencias de Comportamiento

| Aspecto | ANTES (Roto) | DESPUÉS (Fix) |
|---------|--------------|---------------|
| **Backup Manual** | ❌ Error 403 RLS | ✅ Funciona |
| **Backup Automático** | ✅ Funciona | ✅ Funciona |
| **Ver Backups** | ❌ Bloqueado | ✅ Solo admins |
| **Eliminar Backups** | ❌ Bloqueado | ✅ Solo admins |

---

## 🛡️ Seguridad

### Políticas RLS Implementadas

#### 1. INSERT - Usuarios Autenticados
```sql
CREATE POLICY "authenticated_users_can_insert_backups"
ON tbl_backups_registro
FOR INSERT
TO authenticated
WITH CHECK (true);
```
- **Quién**: Cualquier usuario con sesión activa
- **Qué**: Puede crear registros de backup
- **Por qué**: Permite backups manuales

#### 2. SELECT - Solo Administradores
```sql
CREATE POLICY "admins_can_view_all_backups"
ON tbl_backups_registro
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND user_role = 'ADMINISTRADOR'
    )
);
```
- **Quién**: Solo usuarios con rol ADMINISTRADOR
- **Qué**: Pueden ver todos los backups
- **Por qué**: Protección de datos sensibles

#### 3. DELETE - Solo Administradores
```sql
CREATE POLICY "admins_can_delete_backups"
ON tbl_backups_registro
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND user_role = 'ADMINISTRADOR'
    )
);
```
- **Quién**: Solo usuarios con rol ADMINISTRADOR
- **Qué**: Pueden eliminar backups antiguos
- **Por qué**: Mantenimiento de base de datos

---

## 🔄 Rollback (Si es Necesario)

Si necesitas volver atrás:
```sql
-- Desactivar RLS temporalmente (NO RECOMENDADO EN PRODUCCIÓN)
ALTER TABLE tbl_backups_registro DISABLE ROW LEVEL SECURITY;

-- O eliminar todas las políticas
DROP POLICY IF EXISTS "authenticated_users_can_insert_backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "admins_can_view_all_backups" ON tbl_backups_registro;
DROP POLICY IF EXISTS "admins_can_delete_backups" ON tbl_backups_registro;
```

---

## 📝 Notas Adicionales

### ¿Por qué GitHub Actions sigue funcionando?
- GitHub Actions usa la **service_role key** (no la anon key)
- El `service_role` tiene privilegios de superadministrador
- **BYPASSA todas las políticas RLS**
- Por eso nunca tuvo problemas con las políticas restrictivas

### ¿Por qué los backups manuales fallaban?
- Los usuarios usan la **anon key** + sesión JWT
- Supabase les asigna el rol `authenticated`
- Las políticas RLS **SÍ aplican** para este rol
- Si no hay política de INSERT, se bloquea → Error 403

### ¿Es seguro permitir INSERT a todos los usuarios?
- ✅ **SÍ**: Solo usuarios con sesión válida (logged in)
- ✅ **SÍ**: No pueden ver backups de otros (SELECT bloqueado)
- ✅ **SÍ**: No pueden eliminar backups (DELETE bloqueado)
- ✅ **SÍ**: Solo administradores tienen control total

---

## 🎯 Próximos Pasos

1. ✅ Ejecutar `SQL/fix-backup-rls-policies.sql` en Supabase
2. ✅ Probar backup manual en producción
3. ✅ Verificar que backup automático sigue funcionando
4. 📝 Documentar el proceso de backup en CLAUDE.md
5. 🔒 Considerar agregar logs de auditoría para backups

---

**Autor**: Claude Code (fgm-dev)
**Última actualización**: 2025-12-17
