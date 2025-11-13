# 🧪 Plan de Pruebas - Migración STATUS a BOOLEAN

## 📋 Objetivo
Verificar que el cambio del campo STATUS de TEXT a BOOLEAN funciona correctamente en toda la aplicación.

---

## ✅ Checklist de Pruebas

### 1️⃣ **Pruebas de Base de Datos**

#### 1.1 Verificar Estructura de la Tabla
```sql
-- Verificar que la columna status es BOOLEAN
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'status';
```
**Resultado esperado:**
- `data_type`: boolean
- `is_nullable`: NO
- `column_default`: false

#### 1.2 Verificar Índice
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles' AND indexname = 'idx_user_profiles_status';
```
**Resultado esperado:**
- Índice existe y usa la columna `status`

#### 1.3 Verificar Políticas RLS
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'tbl_almacenes'
ORDER BY policyname;
```
**Resultado esperado:**
- 4 políticas creadas
- Todas usan `status = true` (no `status = 'ACTIVO'`)

---

### 2️⃣ **Pruebas de Creación de Usuarios**

#### 2.1 Crear Usuario con Status ACTIVO
```sql
-- Primero crear usuario en Auth (Dashboard de Supabase)
-- Email: test-activo@renfe.es
-- Contraseña: Test123456

-- Luego crear el perfil
INSERT INTO user_profiles (
  user_id,
  nombre_usuario,
  email,
  user_role,
  status
) VALUES (
  '<UUID_DEL_USUARIO>', -- Copiar del auth.users
  'Usuario Test Activo',
  'test-activo@renfe.es',
  'CONSULTAS',
  true  -- ⬅️ ACTIVO
);
```
**Verificación:**
```sql
SELECT email, user_role, status FROM user_profiles WHERE email = 'test-activo@renfe.es';
```
**Resultado esperado:**
- `status`: t (true en PostgreSQL)

#### 2.2 Crear Usuario con Status INACTIVO
```sql
INSERT INTO user_profiles (
  user_id,
  nombre_usuario,
  email,
  user_role,
  status
) VALUES (
  '<UUID_DEL_USUARIO>',
  'Usuario Test Inactivo',
  'test-inactivo@renfe.es',
  'CONSULTAS',
  false  -- ⬅️ INACTIVO
);
```

#### 2.3 Crear Usuario sin Especificar Status (Valor por Defecto)
```sql
INSERT INTO user_profiles (
  user_id,
  nombre_usuario,
  email,
  user_role
) VALUES (
  '<UUID_DEL_USUARIO>',
  'Usuario Test Default',
  'test-default@renfe.es',
  'CONSULTAS'
);

-- Verificar que tomó el valor por defecto (false)
SELECT email, status FROM user_profiles WHERE email = 'test-default@renfe.es';
```
**Resultado esperado:**
- `status`: f (false)

---

### 3️⃣ **Pruebas de Login (Frontend)**

#### 3.1 Login con Usuario ACTIVO ✅
**Pasos:**
1. Ir a la página de login: `http://localhost:5173/login`
2. Ingresar credenciales del usuario ACTIVO
   - Email: `test-activo@renfe.es`
   - Password: `Test123456`
3. Hacer clic en "Iniciar sesión"

**Resultado esperado:**
- ✅ Login exitoso
- ✅ Toast muestra: "Inicio de sesión con éxito"
- ✅ Redirige a `/consultar` (si es CONSULTAS) o `/pedidos` (otros roles)
- ✅ Usuario puede acceder a la aplicación

#### 3.2 Login con Usuario INACTIVO ❌
**Pasos:**
1. Ir a la página de login: `http://localhost:5173/login`
2. Ingresar credenciales del usuario INACTIVO
   - Email: `test-inactivo@renfe.es`
   - Password: `Test123456`
3. Hacer clic en "Iniciar sesión"

**Resultado esperado:**
- ❌ Login rechazado
- ❌ Toast muestra: "Acceso denegado"
- ❌ Mensaje: "El usuario test-inactivo@renfe.es no está autorizado para acceder a la aplicación. Póngase en contacto con el Administrador del sitio para más información."
- ❌ Sesión cerrada automáticamente
- ❌ Usuario permanece en la página de login

#### 3.3 Login con Credenciales Incorrectas
**Pasos:**
1. Ingresar email válido pero contraseña incorrecta

**Resultado esperado:**
- ❌ Mensaje: "Credenciales inválidas. Por favor, verifica tu email y/o contraseña."
- ❌ NO debe aparecer el mensaje de usuario inactivo

---

### 4️⃣ **Pruebas del Panel de Control (Administrador)**

#### 4.1 Visualización de Usuarios
**Prerequisito:** Crear usuario ADMINISTRADOR con `status = true`

**Pasos:**
1. Login como administrador
2. Ir a: `/panel-control`
3. Observar la tabla de usuarios

**Resultado esperado:**
- ✅ Columna "Estado" muestra badges de colores:
  - Verde: ACTIVO
  - Rojo: INACTIVO
- ✅ NO muestra "PENDIENTE"

#### 4.2 Cambiar Status de Usuario (ACTIVO → INACTIVO)
**Pasos:**
1. En el Panel de Control
2. Seleccionar el dropdown de estado de un usuario ACTIVO
3. Cambiar a "Inactivo"

**Resultado esperado:**
- ✅ Toast: "Estado actualizado - El estado se cambió a INACTIVO"
- ✅ Badge cambia a color rojo
- ✅ En BD: `status = false`

**Verificación en BD:**
```sql
SELECT email, status FROM user_profiles WHERE email = 'test-activo@renfe.es';
```

#### 4.3 Cambiar Status de Usuario (INACTIVO → ACTIVO)
**Pasos:**
1. Seleccionar un usuario INACTIVO
2. Cambiar el dropdown a "Activo"

**Resultado esperado:**
- ✅ Toast: "Estado actualizado - El estado se cambió a ACTIVO"
- ✅ Badge cambia a color verde
- ✅ En BD: `status = true`

#### 4.4 Filtrar por Estado
**Pasos:**
1. Usar el filtro de "Estados" en la barra superior
2. Seleccionar "Activo"

**Resultado esperado:**
- ✅ Solo muestra usuarios con `status = true`

**Pasos:**
3. Seleccionar "Inactivo"

**Resultado esperado:**
- ✅ Solo muestra usuarios con `status = false`

#### 4.5 Crear Nuevo Usuario desde el Panel
**Pasos:**
1. Clic en "Agregar Usuario"
2. Llenar el formulario:
   - Nombre: "Usuario Nuevo"
   - Email: "nuevo@renfe.es"
   - Contraseña: "Test123456"
   - Rol: "CONSULTAS"
   - Estado inicial: **Seleccionar "Activo"**
3. Clic en "Crear Usuario"

**Resultado esperado:**
- ✅ Usuario creado correctamente
- ✅ Toast: "Usuario creado"
- ✅ En BD: `status = true`

**Pasos:**
4. Repetir pero seleccionando "Inactivo"

**Resultado esperado:**
- ✅ Usuario creado con `status = false`

---

### 5️⃣ **Pruebas de Políticas RLS**

#### 5.1 Usuario ACTIVO puede Acceder a Almacenes
**Pasos:**
1. Login con usuario ACTIVO (rol CONSULTAS)
2. Ir a página que use `tbl_almacenes`
3. Verificar que puede ver almacenes

**Resultado esperado:**
- ✅ Puede ver los almacenes según su `ambito_almacenes`

#### 5.2 Usuario INACTIVO NO puede Acceder (si llegara a tener sesión)
**Pasos:**
1. Crear un usuario ACTIVO
2. Login con ese usuario
3. Cambiar su status a `false` en BD
4. Intentar acceder a almacenes (sin cerrar sesión)

**Resultado esperado:**
- ❌ No puede ver almacenes (política RLS lo bloquea)
- ❌ Error de permisos

#### 5.3 Administrador ACTIVO puede Gestionar Almacenes
**Pasos:**
1. Login como administrador ACTIVO
2. Ir a gestión de almacenes
3. Intentar crear/editar/eliminar almacén

**Resultado esperado:**
- ✅ Puede gestionar almacenes sin problemas

---

### 6️⃣ **Pruebas de Sesión Activa**

#### 6.1 Cambiar Status Durante Sesión Activa
**Pasos:**
1. Usuario A (ACTIVO) inicia sesión → Sesión activa
2. Administrador cambia el status de Usuario A a INACTIVO
3. Usuario A intenta navegar a otra página

**Resultado esperado:**
- ⚠️ Usuario A seguirá con sesión activa (hasta que cierre sesión)
- ⚠️ Las políticas RLS le bloquearán el acceso a datos protegidos
- 💡 RECOMENDACIÓN: Implementar verificación periódica de status

#### 6.2 Refresh de Página con Status Cambiado
**Pasos:**
1. Usuario tiene sesión activa
2. Administrador cambia su status a INACTIVO
3. Usuario hace refresh (F5) de la página

**Resultado esperado:**
- Depende de cómo esté implementado el `useEffect` en la app
- IDEAL: Verificar status en cada carga de página

---

### 7️⃣ **Pruebas de Actualización de Datos**

#### 7.1 Update Masivo de Status
```sql
-- Activar todos los administradores
UPDATE user_profiles
SET status = true
WHERE user_role = 'ADMINISTRADOR';

-- Verificar
SELECT email, user_role, status FROM user_profiles WHERE user_role = 'ADMINISTRADOR';
```

#### 7.2 Update con Valor Inválido (Debe Fallar)
```sql
-- Intentar asignar texto a campo boolean (debe dar error)
UPDATE user_profiles
SET status = 'ACTIVO'  -- ❌ Esto debe fallar
WHERE email = 'test@renfe.es';
```
**Resultado esperado:**
- ❌ Error: `column "status" is of type boolean but expression is of type text`

---

### 8️⃣ **Pruebas de Compatibilidad**

#### 8.1 Verificar que NO Existen Referencias Antiguas
```bash
# Buscar en el código referencias a 'ACTIVO', 'INACTIVO', 'PENDIENTE'
grep -r "status.*ACTIVO" src/
grep -r "status.*INACTIVO" src/
grep -r "status.*PENDIENTE" src/
```
**Resultado esperado:**
- ✅ Solo deben existir en comentarios o strings de UI
- ✅ NO en comparaciones lógicas

#### 8.2 Verificar TypeScript Types
```bash
# Compilar TypeScript y verificar que no hay errores
npm run build
```
**Resultado esperado:**
- ✅ Build exitoso sin errores de tipo

---

### 9️⃣ **Pruebas de Rendimiento (Opcional)**

#### 9.1 Índice en Status
```sql
EXPLAIN ANALYZE
SELECT * FROM user_profiles WHERE status = true;
```
**Resultado esperado:**
- ✅ Usa el índice `idx_user_profiles_status`

---

### 🔟 **Pruebas de Rollback (Si algo sale mal)**

#### 10.1 Script de Rollback
```sql
-- SOLO SI NECESITAS REVERTIR (NO EJECUTAR SI TODO FUNCIONA)

-- Agregar columna antigua
ALTER TABLE user_profiles ADD COLUMN status_old TEXT;

-- Migrar datos de vuelta
UPDATE user_profiles
SET status_old = CASE
  WHEN status = true THEN 'ACTIVO'
  WHEN status = false THEN 'INACTIVO'
  ELSE 'PENDIENTE'
END;

-- Eliminar columna nueva
ALTER TABLE user_profiles DROP COLUMN status;

-- Renombrar
ALTER TABLE user_profiles RENAME COLUMN status_old TO status;
```

---

## 📊 Resumen de Resultados

| Categoría | Total Pruebas | Estado |
|-----------|---------------|--------|
| Base de Datos | 3 | ⬜ |
| Creación de Usuarios | 3 | ⬜ |
| Login Frontend | 3 | ⬜ |
| Panel de Control | 5 | ⬜ |
| Políticas RLS | 3 | ⬜ |
| Sesión Activa | 2 | ⬜ |
| Update de Datos | 2 | ⬜ |
| Compatibilidad | 2 | ⬜ |
| **TOTAL** | **23** | **⬜** |

---

## 🚀 Orden Recomendado de Ejecución

1. ✅ Pruebas de Base de Datos (1.1 - 1.3)
2. ✅ Creación de Usuarios (2.1 - 2.3)
3. ✅ Pruebas de Login (3.1 - 3.3)
4. ✅ Panel de Control (4.1 - 4.5)
5. ✅ Políticas RLS (5.1 - 5.3)
6. ✅ Compatibilidad (8.1 - 8.2)
7. ⚠️ Sesión Activa (6.1 - 6.2)
8. ⚠️ Update de Datos (7.1 - 7.2)

---

## 📝 Template de Reporte de Pruebas

```markdown
### Prueba: [Nombre]
**Fecha:** 2025-11-01
**Ejecutada por:** [Tu nombre]
**Resultado:** ✅ PASS / ❌ FAIL

**Pasos ejecutados:**
1. ...
2. ...

**Resultado obtenido:**
- ...

**Observaciones:**
- ...
```

---

## 🔍 Checklist Final

Antes de dar por completada la migración, verifica:

- [ ] Todas las pruebas de BD pasaron
- [ ] Login con usuario ACTIVO funciona
- [ ] Login con usuario INACTIVO muestra mensaje correcto
- [ ] Panel de Control muestra solo ACTIVO/INACTIVO
- [ ] Filtros de estado funcionan correctamente
- [ ] Políticas RLS funcionan según el status
- [ ] Build de TypeScript sin errores
- [ ] No hay referencias antiguas a strings de status
- [ ] Documentación actualizada
- [ ] Commit realizado con todos los cambios

---

**¿Necesitas ayuda ejecutando alguna prueba específica?** 🚀
