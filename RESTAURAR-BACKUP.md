# 📥 Guía de Restauración de Backups

## 📋 Índice

1. [Descargar Backup desde GitHub](#paso-1-descargar-el-backup)
2. [Restaurar en Supabase](#paso-2-acceder-a-supabase-sql-editor)
3. [Verificar Restauración](#paso-4-verificar-la-restauración)
4. [Consideraciones Importantes](#consideraciones-importantes)
5. [Solución de Problemas](#solución-de-problemas)

---

## ⚠️ ADVERTENCIA IMPORTANTE

**La restauración de un backup SOBRESCRIBIRÁ todos los datos actuales de la base de datos.**

Antes de restaurar:
- ✅ Haz un backup manual de la base de datos actual
- ✅ Asegúrate de que realmente quieres reemplazar los datos
- ✅ Verifica que estás restaurando el backup correcto

---

## 📥 Paso 1: Descargar el Backup

### Desde GitHub Releases

1. Ve a la página de Releases del proyecto:
   ```
   https://github.com/pako-gm/mat89/releases
   ```

2. Busca el backup que necesitas restaurar:
   - Los releases tienen nombres como: `backup-2025-12-08_19-30`
   - Incluyen fecha y hora de creación
   - Ordenados del más reciente al más antiguo

3. Descarga el archivo `.sql`:
   - Clic en el archivo (ejemplo: `backup_mat89_2025-12-08_19-30.sql`)
   - Se guardará en tu carpeta de Descargas

### Desde la Aplicación Web

1. Ve a la página de Backups:
   ```
   https://tu-app.vercel.app/backup-sistema
   ```

2. Clic en "Generar Backup Manual"

3. El archivo se descargará automáticamente

---

## 🔧 Paso 2: Acceder a Supabase SQL Editor

### Opción A: Desde el Dashboard

1. Accede a tu proyecto Supabase:
   ```
   https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp
   ```

2. En el menú lateral izquierdo, clic en **"SQL Editor"**

3. Clic en **"New query"**

### Opción B: Enlace Directo

```
https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp/sql
```

---

## 📤 Paso 3: Ejecutar el Backup

### Método 1: Copiar y Pegar (Recomendado)

**Para backups pequeños (< 10 MB)**

1. **Abre el archivo descargado**:
   - Usa un editor de texto (Notepad++, VS Code, Sublime Text)
   - NO uses Microsoft Word o similar

2. **Selecciona TODO el contenido**:
   - Atajo: `Ctrl + A`

3. **Copia el contenido**:
   - Atajo: `Ctrl + C`

4. **Pega en el SQL Editor de Supabase**:
   - Atajo: `Ctrl + V`

5. **Ejecuta el script**:
   - Clic en botón **"Run"** (esquina inferior derecha)
   - O atajo: `Ctrl + Enter`

6. **Espera a que termine**:
   - Puede tardar desde segundos hasta varios minutos
   - Verás "Success ✅" cuando complete

### Método 2: Ejecución por Secciones (Para archivos grandes)

**Para backups grandes (> 10 MB)**

El archivo SQL tiene esta estructura:

```sql
-- =============================================
-- SECCIÓN 1: Limpiar datos
-- =============================================
TRUNCATE TABLE tbl_pedidos_rep CASCADE;
TRUNCATE TABLE tbl_materiales CASCADE;
-- ... más TRUNCATE

-- =============================================
-- SECCIÓN 2: Datos de tbl_materiales
-- =============================================
INSERT INTO tbl_materiales VALUES (...);
-- ... más INSERT

-- =============================================
-- SECCIÓN 3: Datos de tbl_pedidos_rep
-- =============================================
INSERT INTO tbl_pedidos_rep VALUES (...);
-- ... más INSERT
```

**Ejecuta cada sección por separado:**

1. **Primero: Sección de TRUNCATE**
   - Copia solo las líneas `TRUNCATE TABLE ...`
   - Pega en SQL Editor → Run
   - Espera a que complete

2. **Segundo: Cada sección de INSERT**
   - Copia una sección completa de INSERT
   - Pega en SQL Editor → Run
   - Repite para cada tabla

---

## ✅ Paso 4: Verificar la Restauración

### Verificación Visual

1. **Ve a "Table Editor"** en Supabase:
   ```
   https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp/editor
   ```

2. **Revisa las tablas principales**:
   - `tbl_materiales` - Debe tener registros
   - `tbl_pedidos_rep` - Debe tener pedidos
   - `tbl_recepciones` - Debe tener recepciones
   - `user_profiles` - Debe tener usuarios
   - `tbl_almacenes` - Debe tener almacenes
   - `tbl_proveedores` - Debe tener proveedores

### Verificación con SQL

Ejecuta esta query en SQL Editor:

```sql
SELECT
  'tbl_materiales' as tabla,
  COUNT(*) as registros
FROM tbl_materiales
UNION ALL
SELECT
  'tbl_pedidos_rep',
  COUNT(*)
FROM tbl_pedidos_rep
UNION ALL
SELECT
  'tbl_recepciones',
  COUNT(*)
FROM tbl_recepciones
UNION ALL
SELECT
  'user_profiles',
  COUNT(*)
FROM user_profiles
UNION ALL
SELECT
  'tbl_almacenes',
  COUNT(*)
FROM tbl_almacenes
UNION ALL
SELECT
  'tbl_proveedores',
  COUNT(*)
FROM tbl_proveedores
ORDER BY tabla;
```

**Resultado esperado:**
```
tabla              | registros
-------------------|----------
tbl_almacenes      | 5
tbl_materiales     | 150
tbl_pedidos_rep    | 45
tbl_proveedores    | 12
tbl_recepciones    | 38
user_profiles      | 8
```

### Verificación en la Aplicación

1. Abre la aplicación web
2. Verifica que puedes ver:
   - Lista de materiales
   - Pedidos existentes
   - Recepciones registradas
   - Usuarios en Panel de Control

---

## 🔒 Consideraciones Importantes

### Antes de Restaurar

#### ✅ SIEMPRE Haz un Backup Previo

**Método 1: Backup Manual desde la App**
```
1. Ir a https://tu-app.vercel.app/backup-sistema
2. Clic en "Generar Backup Manual"
3. Guardar el archivo con nombre descriptivo
```

**Método 2: Desde Supabase**
```sql
-- Exportar tabla específica
COPY tbl_pedidos_rep TO STDOUT CSV HEADER;
```

#### ⚠️ Momento Adecuado para Restaurar

- ✅ Fuera del horario laboral
- ✅ Cuando no haya usuarios activos en el sistema
- ✅ Después de notificar a los usuarios
- ❌ NO restaurar durante operaciones críticas

#### 🔍 Verificar el Backup Antes de Restaurar

1. **Descarga el archivo**
2. **Ábrelo con un editor de texto**
3. **Verifica que contiene**:
   ```sql
   -- Debe empezar con comentarios de identificación
   -- BACKUP DE BASE DE DATOS - mat89
   -- Fecha: ...

   -- Debe tener comandos TRUNCATE
   TRUNCATE TABLE ...

   -- Debe tener comandos INSERT
   INSERT INTO ...
   ```

4. **Verifica la fecha del backup**:
   - Asegúrate de que es el backup que quieres restaurar
   - Confirma que los datos son de la fecha correcta

---

## 🎯 Restauración Selectiva

### Restaurar Solo Algunas Tablas

Si solo necesitas restaurar **tablas específicas**:

1. **Abre el archivo SQL**

2. **Busca la sección de la tabla**:
   ```sql
   -- TABLA: tbl_materiales
   TRUNCATE TABLE tbl_materiales CASCADE;
   INSERT INTO tbl_materiales (id, num_serie, descripcion, ...) VALUES
     (1, 'MAT001', 'Material 1', ...),
     (2, 'MAT002', 'Material 2', ...);
   ```

3. **Copia SOLO esa sección**:
   - Incluye el `TRUNCATE` si quieres limpiar primero
   - Incluye todos los `INSERT` de esa tabla

4. **Pega y ejecuta en SQL Editor**

### Ejemplo: Restaurar Solo Materiales y Proveedores

```sql
-- 1. Limpiar tablas
TRUNCATE TABLE tbl_materiales CASCADE;
TRUNCATE TABLE tbl_proveedores CASCADE;

-- 2. Restaurar materiales
INSERT INTO tbl_materiales VALUES (...);
-- ... resto de inserts

-- 3. Restaurar proveedores
INSERT INTO tbl_proveedores VALUES (...);
-- ... resto de inserts
```

---

## 🆘 Solución de Problemas

### Error: "permission denied for table X"

**Causa**: Tu usuario no tiene permisos suficientes

**Solución**:
1. Asegúrate de estar usando la cuenta de administrador de Supabase
2. Verifica los permisos en Supabase Dashboard
3. Contacta al administrador del proyecto

### Error: "duplicate key value violates unique constraint"

**Causa**: Ya hay datos en la tabla que conflictúan con el backup

**Solución**:
```sql
-- Limpia la tabla primero
TRUNCATE TABLE nombre_tabla CASCADE;

-- Luego ejecuta los INSERT del backup
INSERT INTO nombre_tabla ...
```

### Error: "syntax error at or near X"

**Causa**: El archivo SQL está corrupto o mal formateado

**Solución**:
1. Descarga el backup nuevamente
2. Verifica que el archivo no esté dañado
3. Abre con un editor de texto (no Word)
4. Busca caracteres extraños o saltos de línea incorrectos

### Error: "relation X does not exist"

**Causa**: La tabla no existe en la base de datos

**Solución**:
1. Verifica que estás en el proyecto correcto de Supabase
2. Ejecuta las migraciones necesarias primero
3. Contacta al administrador del proyecto

### El SQL Editor se Congela o Falla

**Causa**: El archivo es muy grande para ejecutar de una vez

**Solución**:
1. **Divide el archivo en secciones más pequeñas**
2. **Ejecuta por tablas**:
   - Primera ejecución: Solo tabla A
   - Segunda ejecución: Solo tabla B
   - etc.

3. **Aumenta el timeout** (si es posible):
   ```sql
   SET statement_timeout = '600s'; -- 10 minutos
   ```

### Los Datos Restaurados son Incorrectos

**Causa**: Se restauró el backup equivocado

**Solución**:
1. **Identifica el backup correcto** por fecha
2. **Restaura el backup previo** que hiciste antes
3. **Verifica la fecha y contenido** antes de volver a restaurar

---

## 📊 Estructura del Archivo de Backup

### Formato Típico

```sql
-- =============================================
-- BACKUP DE BASE DE DATOS - mat89
-- Fecha: 2025-12-08 19:30:15
-- Proyecto: Sistema de Gestión de Reparaciones
-- =============================================

-- Información del backup
-- Total de tablas: 8
-- Generado por: backup-standalone.js

-- =============================================
-- SECCIÓN 1: Limpieza de datos existentes
-- =============================================

TRUNCATE TABLE tbl_ln_pedidos_rep CASCADE;
TRUNCATE TABLE tbl_recepciones CASCADE;
TRUNCATE TABLE tbl_pedidos_rep CASCADE;
TRUNCATE TABLE tbl_materiales CASCADE;
TRUNCATE TABLE tbl_proveedores CASCADE;
TRUNCATE TABLE tbl_almacenes CASCADE;
TRUNCATE TABLE user_profiles CASCADE;
TRUNCATE TABLE app_versions CASCADE;

-- =============================================
-- SECCIÓN 2: Datos de tbl_almacenes
-- =============================================

INSERT INTO tbl_almacenes (id, codigo, nombre, descripcion) VALUES
  (1, 'ALM01', 'Almacén Central', 'Almacén principal'),
  (2, 'ALM02', 'Almacén Secundario', 'Almacén de respaldo');

-- ... más secciones para cada tabla
```

### Tablas Incluidas (en orden)

1. `app_versions` - Versiones de la aplicación
2. `user_profiles` - Perfiles de usuario
3. `tbl_almacenes` - Almacenes
4. `tbl_proveedores` - Proveedores
5. `tbl_materiales` - Materiales
6. `tbl_pedidos_rep` - Pedidos de reparación
7. `tbl_recepciones` - Recepciones
8. `tbl_ln_pedidos_rep` - Líneas de pedidos

---

## 🔄 Proceso Completo Recomendado

### Checklist de Restauración

- [ ] **Pre-restauración**
  - [ ] Notificar a usuarios del sistema
  - [ ] Hacer backup manual de seguridad
  - [ ] Descargar el backup a restaurar
  - [ ] Verificar contenido del archivo
  - [ ] Verificar fecha del backup

- [ ] **Durante la restauración**
  - [ ] Cerrar la aplicación web (modo mantenimiento)
  - [ ] Abrir Supabase SQL Editor
  - [ ] Ejecutar el script SQL
  - [ ] Esperar confirmación de éxito

- [ ] **Post-restauración**
  - [ ] Verificar conteo de registros
  - [ ] Probar login en la aplicación
  - [ ] Verificar datos en Table Editor
  - [ ] Probar funcionalidades críticas
  - [ ] Notificar a usuarios que el sistema está disponible

---

## 📞 Información Adicional

### Archivos Relacionados

- **Generar backup**: `src/pages/BackupSistema.tsx`
- **Script de backup**: `scripts/backup-standalone.js`
- **Configuración GitHub Actions**: `.github/workflows/weekly-backup.yml`
- **Guía de configuración**: `BACKUP-SETUP.md`

### Enlaces Útiles

- **GitHub Releases**: https://github.com/pako-gm/mat89/releases
- **Supabase Dashboard**: https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp
- **SQL Editor**: https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp/sql
- **Table Editor**: https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp/editor

### Soporte

Si encuentras problemas durante la restauración:

1. Revisa la sección "Solución de Problemas" de este documento
2. Verifica los logs del SQL Editor en Supabase
3. Consulta la documentación de Supabase: https://supabase.com/docs
4. Contacta al administrador del sistema

---

## 📝 Notas Finales

- Los backups automáticos se generan **cada domingo a las 3:00 AM UTC**
- Los backups se guardan en **GitHub Releases** automáticamente
- Se mantienen los **últimos 10 backups** en el workflow
- Los backups manuales se pueden generar desde la aplicación web
- **SIEMPRE** verifica que tienes un backup antes de hacer cambios importantes

---

**Documento actualizado**: 2025-12-08
**Versión**: 1.0
**Autor**: Sistema de Backups Automáticos mat89
