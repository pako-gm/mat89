# 🚀 Instrucciones Rápidas: Corregir Error RLS

## ❌ Error que estás viendo:
```
Error: policy "Users can read own profile" for table "user_profiles" already exists
```

## ✅ Solución en 3 pasos:

### Paso 1: Abrir Supabase SQL Editor

1. Ve a: https://app.supabase.com
2. Selecciona tu proyecto **Mat89**
3. Click en **SQL Editor** (menú lateral izquierdo)
4. Click en **New query**

### Paso 2: Copiar y Ejecutar el Script

1. Abre el archivo: **`fix-rls-quick.sql`** (está en la raíz del proyecto)
2. Copia TODO el contenido
3. Pega en el SQL Editor de Supabase
4. Click en **RUN** o presiona `Ctrl + Enter`

### Paso 3: Verificar que Funcionó

Deberías ver en los resultados:
```
✅ Success: 7 rows (7 políticas creadas)
```

## 🧪 Probar que se Corrigió

Ejecuta en tu terminal:

```bash
# 1. Verificar políticas
node scripts/check-rls-policies.js

# 2. Probar backup
npm run backup
```

**Resultado esperado:**
```
✅ Consulta exitosa. Registros encontrados: X
✅ Backup generado exitosamente (sin error de recursión)
```

## ⚠️ Si Sigue Dando Error

Si después de ejecutar el script sigue dando error, ejecuta este comando adicional en SQL Editor:

```sql
-- Forzar eliminación de TODAS las políticas
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_profiles', pol.policyname);
  END LOOP;
END $$;
```

Luego ejecuta nuevamente el `fix-rls-quick.sql` completo.

## 📋 ¿Qué hace el script?

1. ✅ Desactiva RLS temporalmente
2. ✅ Elimina TODAS las políticas antiguas (las que causan recursión)
3. ✅ Crea función `is_admin()` que NO causa recursión
4. ✅ Reactiva RLS
5. ✅ Crea 7 nuevas políticas sin recursión:
   - Users read own profile
   - Admins read all profiles
   - Users insert own profile
   - Admins insert profiles
   - Users update own profile
   - Admins update all profiles
   - Admins delete profiles

## 🎯 Después de Aplicar

El Panel de Control debería funcionar perfectamente:
- ✅ Los usuarios ven solo su perfil
- ✅ Los administradores ven todos los usuarios
- ✅ El backup se ejecuta sin errores
- ✅ No más recursión infinita

## 📞 ¿Problemas?

Si tienes problemas, comparte la salida de:

```bash
node scripts/check-rls-policies.js
```

---

**Archivos relacionados:**
- `fix-rls-quick.sql` - Script principal (ejecutar en Supabase)
- `supabase/migrations/20251012000001_fix_user_profiles_rls_recursion_v2.sql` - Versión para migración
- `docs/RLS-RECURSION-FIX.md` - Documentación completa técnica
