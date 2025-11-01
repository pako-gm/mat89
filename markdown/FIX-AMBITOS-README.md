# ⚡ Fix Rápido: Gestión de Ámbitos

## 🚨 Problema
- ❌ **Almacenes no se muestran** en el modal "Gestionar Ámbitos"
- ❌ **Error al guardar**: "No se pudieron guardar los ámbitos"

## ✅ Solución Rápida (5 minutos)

### Paso 1: Ejecuta el script SQL completo

1. Abre: https://mlisnngduwrlqxyjjibp.supabase.co/project/_/sql

2. Copia **TODO** el contenido de: `fix-ambitos-complete.sql`

3. Pégalo en el SQL Editor y haz clic en **"Run"**

4. Verifica que aparezcan ✅ en los resultados

### Paso 2: Recarga la aplicación

1. Presiona `F5` en el navegador

2. Inicia sesión como **administrador**

3. Ve al **Panel de Control** → Haz clic en **"Ámbito"** de cualquier usuario

4. Verifica que:
   - ✅ Se muestran los almacenes
   - ✅ Puedes seleccionar/deseleccionar
   - ✅ Al guardar aparece toast verde: "Ámbitos actualizados"

## 📚 Documentación Completa

Para entender el problema y la solución en detalle:
→ Ver [INSTRUCCIONES-AMBITOS-COMPLETO.md](INSTRUCCIONES-AMBITOS-COMPLETO.md)

## 🆘 Si algo falla

1. Abre la consola del navegador (F12)
2. Busca mensajes de error en rojo
3. Copia el error y verifica:
   - ¿Las políticas se crearon? → Consulta `pg_policies`
   - ¿La columna existe? → Consulta `information_schema.columns`
   - ¿Eres administrador activo? → Consulta `user_profiles`

## 📁 Archivos importantes

| Archivo | Descripción |
|---------|-------------|
| `fix-ambitos-complete.sql` | ⭐ **Script principal** (usar este) |
| `INSTRUCCIONES-AMBITOS-COMPLETO.md` | 📖 Documentación detallada |
| [src/pages/PanelDeControl.tsx](src/pages/PanelDeControl.tsx) | ✏️ Código mejorado (ya aplicado) |

---

**Fecha**: 2025-10-14 | **Estado**: ✅ Listo para usar | **Tiempo**: ~5 min