# 🔧 Cómo Aplicar la Migración de Seguridad

## ⚠️ URGENTE: Migración Crítica de Seguridad

**Migración:** `20250113000000_fix_user_profiles_role_security.sql`
**Severidad:** CRÍTICA
**Impacto:** Corrige vulnerabilidad de escalación de privilegios

---

## 🚀 Método Recomendado: Supabase Dashboard (5 minutos)

### Paso 1: Abre el SQL Editor

Navega a: https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp/sql/new

### Paso 2: Copia el SQL

Abre el archivo: `supabase/migrations/20250113000000_fix_user_profiles_role_security.sql`

O copia directamente:

```sql
BEGIN;

-- 1. Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- 2. Create a restricted policy for users to update ONLY their name
CREATE POLICY "Users can update own name only"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND user_role = (SELECT user_role FROM user_profiles WHERE user_id = auth.uid())
);

-- 3. Ensure administrators can still update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  )
);

COMMIT;
```

### Paso 3: Ejecuta

- Click en **"RUN"** o presiona `Ctrl + Enter`
- Verifica que aparezca **"Success ✅"**

### Paso 4: Verifica

Ve a **Database > Policies** y selecciona la tabla `user_profiles`. Deberías ver:

- ✅ "Users can update own name only" (NUEVA)
- ✅ "Admins can update all profiles" (RECREADA)
- ❌ "Users can update own profile" (ELIMINADA)

---

## 🔐 Método Alternativo: Supabase CLI desde VSCode

### Requisitos Previos

La Supabase CLI ya está instalada en el proyecto:

```bash
npx supabase --version
# Debe mostrar: 2.58.5 o superior
```

### Opción A: Con Access Token

1. **Obtén tu token**:
   - Ve a: https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Copia el token

2. **Configura la variable de entorno** (PowerShell):
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN="tu_token_aqui"
   ```

3. **Link el proyecto**:
   ```bash
   npm run supabase:link -- --project-ref mlisnngduwrlqxyjjibp
   ```

4. **Aplica la migración**:
   ```bash
   npm run db:push
   ```

### Opción B: Login Interactivo (en terminal real)

Si estás en una terminal normal (no en el terminal de VSCode integrado):

```bash
npx supabase login
npx supabase link --project-ref mlisnngduwrlqxyjjibp
npm run db:push
```

---

## ✅ Verificación Post-Migración

### 1. Verifica Políticas en Supabase Dashboard

**Database > Policies > user_profiles**

Debe mostrar:
- ✅ "Users can update own name only"
- ✅ "Admins can update all profiles"

### 2. Prueba Funcional

1. Inicia la aplicación: `npm run dev`
2. Crea un usuario de prueba con rol `CONSULTAS`
3. Ve a **Panel de Control > Auditoría de Seguridad**
4. Ejecuta **"Ejecutar Todas las Pruebas"**
5. El **Test 5** debe mostrar: **"✓ SEGURO"** (color verde)

Si el test sigue mostrando "🚨 CRÍTICO", la migración no se aplicó correctamente.

### 3. Verifica que Panel de Control funciona

1. Inicia sesión como **ADMINISTRADOR**
2. Ve a **Panel de Control**
3. Intenta cambiar el rol de un usuario
4. Debe funcionar correctamente ✅

---

## 🐛 Troubleshooting

### Error: "policy already exists"

Si ves este error, significa que alguna política ya existe. Ejecuta manualmente:

```sql
DROP POLICY IF EXISTS "Users can update own name only" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
```

Y luego vuelve a ejecutar la migración completa.

### Error: "Access token not provided"

Necesitas configurar el access token. Opciones:

1. Usa el método del Dashboard (recomendado)
2. Configura `SUPABASE_ACCESS_TOKEN` en tu .env
3. Usa `npx supabase login --token tu_token_aqui`

### Las pruebas siguen fallando después de la migración

1. Verifica que las políticas se crearon correctamente en el Dashboard
2. Cierra sesión y vuelve a iniciar sesión en la app
3. Limpia la caché del navegador
4. Verifica que tu usuario tiene rol ADMINISTRADOR en la tabla user_profiles

---

## 📚 Scripts NPM Disponibles

Ahora tienes estos scripts disponibles:

```bash
npm run db:push          # Aplicar migraciones pendientes
npm run db:pull          # Descargar esquema de Supabase
npm run db:reset         # Resetear base de datos local (¡CUIDADO!)
npm run supabase:link    # Vincular proyecto
npm run supabase:status  # Ver estado de la conexión
```

---

## 🔒 ¿Por Qué Es Urgente Esta Migración?

**Sin esta migración:**
- ❌ Cualquier usuario puede cambiar su rol a ADMINISTRADOR
- ❌ Bypassa completamente el control de acceso
- ❌ Permite acceso no autorizado a todas las funciones

**Con esta migración:**
- ✅ Solo administradores pueden cambiar roles
- ✅ Usuarios solo pueden actualizar su nombre
- ✅ Campo `user_role` está protegido con `WITH CHECK`

---

## 📞 Soporte

Si tienes problemas aplicando la migración:

1. Verifica que tienes permisos de administrador en Supabase
2. Revisa los logs en Supabase Dashboard > Logs
3. Si persiste, contacta al equipo de desarrollo

---

**Última actualización:** 2025-01-13
**Autor:** Equipo de desarrollo Mat89
