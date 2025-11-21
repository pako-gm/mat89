# Flag Temporal de Borrado Real de Pedidos

## 📋 Descripción

Este documento explica el sistema de flag temporal implementado para las pruebas del módulo de garantías en localhost (rama `GARANTIAS-REPARACION`).

**Estado actual**: El flag está **ACTIVADO** para borrado físico (real) de pedidos.

---

## 🔧 Cómo funciona

Se ha implementado un flag de configuración en `src/lib/data.ts`:

```typescript
export const ENABLE_REAL_ORDER_DELETION = true;
```

### Comportamiento según el flag:

| Flag Value | Comportamiento | Acción al pulsar 🗑️ |
|------------|----------------|----------------------|
| `true`     | **Borrado REAL** (físico) | Elimina el pedido de la base de datos permanentemente |
| `false`    | **Soft delete** (cancelar) | Marca el pedido como `cancelado = true` (se visualiza tachado) |

---

## 🚀 Cómo cambiar entre modos

### Para ACTIVAR borrado real (modo actual):

**Archivo**: `src/lib/data.ts`

```typescript
export const ENABLE_REAL_ORDER_DELETION = true;
```

### Para DESACTIVAR y volver al comportamiento original:

**Archivo**: `src/lib/data.ts`

```typescript
export const ENABLE_REAL_ORDER_DELETION = false;
```

**¡IMPORTANTE!**: Después de cambiar el flag, ejecutar:

```bash
npm run build
# O si estás en modo desarrollo:
npm run dev
```

---

## 📁 Archivos modificados

### 1. `src/lib/data.ts`

- **Líneas 5-14**: Declaración del flag `ENABLE_REAL_ORDER_DELETION` con documentación
- **Línea 569**: Función `deleteOrder()` (borrado físico de la base de datos)
- **Líneas 582-608**: Funciones `cancelOrder()` y `reactivateOrder()` (soft delete)

### 2. `src/components/orders/OrderList.tsx`

- **Línea 5**: Import del flag `ENABLE_REAL_ORDER_DELETION`
- **Líneas 219-229**: Función `confirmCancelOrder()` que decide qué acción ejecutar según el flag
- **Líneas 1120-1142**: Diálogo de confirmación de cancelación (solo se muestra si el flag es `false`)
- **Líneas 1091-1118**: Diálogo de confirmación de eliminación (se usa cuando el flag es `true`)

---

## 🧪 Casos de uso

### Modo Borrado Real (`true`) - ACTUAL

```typescript
// Usuario pulsa icono de papelera 🗑️
confirmCancelOrder(orderId) → setOrderToDelete(orderId) → handleDeleteOrder()
                                                             ↓
                                                  await deleteOrder(orderId)
                                                             ↓
                                          DELETE FROM tbl_pedidos_rep WHERE id = orderId
```

**Resultado**: El pedido se elimina **permanentemente** de la base de datos.

### Modo Soft Delete (`false`) - COMPORTAMIENTO ORIGINAL

```typescript
// Usuario pulsa icono de papelera 🗑️
confirmCancelOrder(orderId) → setOrderToCancel(orderId) → handleCancelOrder()
                                                             ↓
                                                  await cancelOrder(orderId)
                                                             ↓
                                    UPDATE tbl_pedidos_rep SET cancelado = true WHERE id = orderId
```

**Resultado**: El pedido permanece en la base de datos pero se marca como `cancelado = true` y se visualiza tachado en la UI.

---

## ⚠️ Notas importantes

1. **Base de datos**: El borrado real elimina:
   - El registro del pedido en `tbl_pedidos_rep`
   - Las líneas de pedido asociadas en `tbl_ln_pedidos_rep` (CASCADE)
   - El historial de cambios en `tbl_historico_cambios` (CASCADE)
   - Las recepciones en `tbl_recepciones` (CASCADE)

2. **Reversión del flag**: Al cambiar el flag de `true` a `false`, los pedidos que fueron **eliminados físicamente** NO se pueden recuperar. Solo aplica para pedidos creados después del cambio.

3. **Entorno de producción**: Antes de desplegar a producción, asegurarse de configurar el flag en `false` para mantener el comportamiento de soft delete.

4. **Tests en localhost**: El flag está pensado específicamente para pruebas del módulo de garantías en localhost, donde es necesario borrar y recrear pedidos rápidamente.

---

## 🔄 Restaurar comportamiento original

Para volver al comportamiento original (soft delete):

1. Abrir `src/lib/data.ts`
2. Cambiar la línea 14:
   ```typescript
   export const ENABLE_REAL_ORDER_DELETION = false;
   ```
3. Guardar el archivo
4. Ejecutar `npm run build` o reiniciar `npm run dev`

**¡Listo!** Los pedidos volverán a cancelarse (marcarse como `cancelado = true`) en lugar de eliminarse físicamente.

---

## 📞 Contacto

- **Rama actual**: `GARANTIAS-REPARACION`
- **Entorno**: localhost (desarrollo)
- **Propósito**: Pruebas del módulo de garantías

---

*Documento generado: 2025-11-17*
*Última actualización: 2025-11-17*
