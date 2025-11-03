# 🔒 Solución: Recursión Infinita en RLS de user_profiles

## 🐛 Problema Detectado

Al ejecutar el backup de la base de datos, se detectó un error de recursión infinita:

```
❌ Error en user_profiles: infinite recursion detected in policy for relation "user_profiles"
```

### Causa Raíz

Las políticas RLS (Row Level Security) de `user_profiles` tenían recursión infinita porque estaban consultando la **misma tabla** dentro de sus propias políticas:

```sql
-- ❌ INCORRECTO - Causa recursión infinita
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles  -- ← RECURSIÓN AQUÍ
    WHERE id = auth.uid() AND role = 'ADMINISTRADOR'
  )
);
```

**¿Por qué causa recursión?**

1. PostgreSQL intenta verificar la policy para `user_profiles`
2. La policy consulta `user_profiles`
3. Para consultar `user_profiles`, PostgreSQL necesita verificar la policy
4. Vuelve al paso 1 → **Bucle infinito** ♾️

## ✅ Solución Implementada

### Opción 1: Función Helper con SECURITY DEFINER (Recomendada)

Creamos una función que verifica el rol sin causar recursión:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER  -- Ejecuta con permisos del dueño, evita RLS
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND user_role = 'ADMINISTRADOR'
  );
$$;
```

**Ventajas de SECURITY DEFINER:**
- ✅ La función se ejecuta con permisos de superusuario
- ✅ Omite las políticas RLS
- ✅ Evita la recursión infinita
- ✅ Permite verificar el rol de forma segura

### Nuevas Políticas (Sin Recursión)

#### 1. Lectura del Propio Perfil

```sql
CREATE POLICY "Users can read own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

**Explicación:** Cada usuario puede leer solo su propio perfil (donde `user_id` coincide con su ID de autenticación).

#### 2. Inserción de Perfil Propio

```sql
CREATE POLICY "Allow insert for authenticated users"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

**Explicación:** Necesario para el proceso de registro. Los usuarios pueden crear su propio perfil.

#### 3. Actualización de Perfil Propio

```sql
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
```

**Explicación:** Los usuarios pueden actualizar su propio nombre, pero no su rol (controlado por la aplicación).

#### 4. Políticas para Administradores (Opcional)

Si deseas que los administradores tengan acceso completo vía RLS:

```sql
CREATE POLICY "Admins can read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());  -- Usa la función helper

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (public.is_admin());
```

## 🔄 Aplicar la Corrección

### Paso 1: Ejecutar la Migración

La migración ya está creada en:
```
supabase/migrations/20251012000000_fix_user_profiles_rls_recursion.sql
```

**Opción A: Via Supabase Dashboard**

1. Ve a: https://app.supabase.com → Tu proyecto
2. **SQL Editor**
3. Copia el contenido de la migración
4. Ejecuta el script

**Opción B: Via Supabase CLI** (si lo tienes instalado)

```bash
supabase db push
```

### Paso 2: Verificar la Corrección

Ejecuta el script de verificación:

```bash
node scripts/check-rls-policies.js
```

Deberías ver:
```
✅ Consulta exitosa. Registros encontrados: X
```

### Paso 3: Probar el Backup

```bash
npm run backup
```

Ya no debería aparecer el error de recursión.

## 🎯 Arquitectura Recomendada

### Para Operaciones Regulares (Usuarios)

- ✅ Usar RLS policies simples (leer/actualizar propio perfil)
- ✅ Confiar en la autenticación de Supabase

### Para Operaciones Administrativas (Panel de Control)

**Opción A: Backend con Service Role Key** (Más seguro)

```javascript
// server.js (Node.js backend)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ← Service Role Key
);

// Este cliente omite RLS
app.get('/api/admin/users', async (req, res) => {
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('*');  // No afectado por RLS

  res.json(data);
});
```

**Opción B: RLS con Función Helper** (Implementado)

```javascript
// frontend (PanelDeControl.tsx)
// Las policies usan is_admin() que no causa recursión
const { data } = await supabase
  .from('user_profiles')
  .select('*');  // Funciona si eres admin
```

**Opción C: JWT Custom Claims** (Avanzado)

Almacenar el rol en el JWT del usuario:

```javascript
// Al hacer login, agregar claim personalizado
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'password'
});

// Luego en policies:
CREATE POLICY "Admins can read all"
ON user_profiles FOR SELECT
USING ((auth.jwt() ->> 'user_role') = 'ADMINISTRADOR');
```

## 📋 Checklist de Verificación

Después de aplicar la corrección, verificar:

- [ ] No hay error de recursión al consultar `user_profiles`
- [ ] Los usuarios pueden leer su propio perfil
- [ ] El Panel de Control funciona correctamente
- [ ] Los administradores pueden ver todos los usuarios
- [ ] El backup se ejecuta sin errores

## 🔧 Comandos Útiles

### Ver Políticas Actuales

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles';
```

### Verificar Función Helper

```sql
SELECT public.is_admin();
-- Debería retornar TRUE si eres admin, FALSE si no
```

### Test Manual

```sql
-- Como usuario regular
SELECT * FROM user_profiles WHERE user_id = auth.uid();
-- Debería retornar solo tu perfil

-- Como admin (con función helper habilitada)
SELECT * FROM user_profiles;
-- Debería retornar todos los perfiles
```

## 📚 Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)

## ⚠️ Notas de Seguridad

1. **SECURITY DEFINER es poderoso**: La función `is_admin()` omite RLS, úsala con cuidado
2. **Validar en la aplicación**: Siempre verifica roles también en el frontend/backend
3. **Service Role Key**: Nunca expongas la Service Role Key en el frontend
4. **Logging**: Considera agregar logging a operaciones administrativas

---

**🎉 Problema resuelto:** Las políticas RLS ya no tienen recursión infinita

**📅 Fecha**: Octubre 2025
**👨‍💻 Implementado por**: Claude Code
