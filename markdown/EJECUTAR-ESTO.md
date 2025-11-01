# ⚡ SOLUCIÓN RÁPIDA - Eliminar Políticas Duplicadas

## 🎯 Problema
Tienes **11 políticas en lugar de 7** porque hay duplicados:
- "Admin can delete users" + "Admins can delete profiles" ❌
- "Admin can insert users" + "Admins can insert profiles" ❌
- etc.

## ✅ Solución en 2 Pasos

### PASO 1: Abrir Supabase SQL Editor
1. https://app.supabase.com → Tu proyecto
2. **SQL Editor** (menú izquierdo)
3. **New query**

### PASO 2: Ejecutar Este Script

👉 **Abre el archivo: `fix-rls-clean-all.sql`**

📋 **Copia TODO el contenido y pégalo en Supabase**

▶️ **Click en RUN**

## 🎉 Resultado Esperado

Deberías ver en los resultados finales:

```
✅ 7 políticas creadas:

1. users_read_own          (SELECT)
2. admins_read_all         (SELECT)
3. users_insert_own        (INSERT)
4. admins_insert_any       (INSERT)
5. users_update_own        (UPDATE)
6. admins_update_all       (UPDATE)
7. admins_delete_any       (DELETE)
```

## 🧪 Verificar

Después de ejecutar el script:

```bash
npm run backup
```

Debería funcionar sin errores:
```
✅ Backup generado exitosamente
```

## 📋 ¿Qué hace el script?

1. ✅ Desactiva RLS temporalmente
2. ✅ **Elimina TODAS las 11 políticas** (usando loop dinámico)
3. ✅ Crea función `is_admin()` sin recursión
4. ✅ Reactiva RLS
5. ✅ Crea **solo 7 políticas** con nombres simples
6. ✅ Muestra resultado final para verificar

---

**Archivo a usar:** `fix-rls-clean-all.sql`
