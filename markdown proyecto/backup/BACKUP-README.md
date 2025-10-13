# 💾 Sistema de Backup de Base de Datos - Mat89

## 📋 Resumen

Se ha implementado un sistema automático de backup completo para la base de datos de Mat89 en Supabase. Este sistema exporta tanto la **estructura** (CREATE TABLE, índices, constraints) como los **datos** (INSERT INTO) de todas las tablas.

## ✨ Características

- ✅ **Exportación completa**: Estructura + Datos
- ✅ **Formato SQL estándar**: Compatible con PostgreSQL/Supabase
- ✅ **Tablas incluidas**: Todas las tablas principales del sistema
- ✅ **Timestamp automático**: Nombre de archivo con fecha
- ✅ **Fácil restauración**: Un solo archivo SQL
- ✅ **Comentarios descriptivos**: Documentación en el SQL generado

## 🚀 Uso Rápido

### Generar Backup

```bash
npm run backup
```

El archivo se generará en: `backups/backup_mat89_YYYY-MM-DD.sql`

## 📦 Tablas Incluidas en el Backup

El sistema respalda las siguientes tablas:

1. **`tbl_almacenes`** - Catálogo de almacenes del sistema
2. **`tbl_proveedores`** - Proveedores internos y externos
3. **`tbl_materiales`** - Catálogo de materiales (matrícula 89)
4. **`tbl_pedidos_rep`** - Pedidos de reparación
5. **`tbl_ln_pedidos_rep`** - Líneas de detalle de pedidos
6. **`tbl_recepciones`** - Recepciones de material reparado
7. **`tbl_historico_cambios`** - Auditoría de cambios
8. **`user_profiles`** - Perfiles de usuario con roles

## 📁 Estructura del Archivo Generado

```sql
-- ============================================
-- BACKUP COMPLETO - Mat89 Database
-- Fecha: 12/10/2025, 20:00:55
-- ============================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ESTRUCTURA (CREATE TABLE)
CREATE TABLE IF NOT EXISTS tbl_proveedores (...);
CREATE TABLE IF NOT EXISTS tbl_materiales (...);
-- ... todas las tablas

-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_tbl_proveedores_nombre ...;
-- ... todos los índices

-- 4. DATOS (INSERT INTO)
INSERT INTO tbl_proveedores (...) VALUES (...);
INSERT INTO tbl_materiales (...) VALUES (...);
-- ... todos los datos
```

## 🔧 Configuración

### Requisitos

- Node.js instalado
- Variables de entorno configuradas (`.env`):
  ```env
  VITE_SUPABASE_URL=tu-url-de-supabase
  VITE_SUPABASE_ANON_KEY=tu-anon-key
  ```

### Archivos del Sistema

```
mat89/
├── scripts/
│   └── backup-database.js    # Script principal de backup
├── backups/
│   ├── .gitkeep              # Mantiene carpeta en git
│   └── backup_mat89_*.sql    # Archivos generados (ignorados por git)
├── package.json              # Contiene script "backup"
└── .env                      # Variables de entorno
```

## 📖 Documentación Técnica

### Script: `backup-database.js`

El script realiza las siguientes operaciones:

1. **Conexión a Supabase**
   ```javascript
   const supabase = createClient(supabaseUrl, supabaseKey);
   ```

2. **Generación de Estructura**
   - CREATE TABLE statements
   - Índices (CREATE INDEX)
   - Foreign keys y constraints
   - Comentarios descriptivos

3. **Exportación de Datos**
   - Para cada tabla:
     - SELECT * FROM tabla
     - Generación de INSERT statements
     - Escape de valores especiales (strings, arrays, JSON, NULL)

4. **Guardado del Archivo**
   - Nombre: `backup_mat89_YYYY-MM-DD.sql`
   - Ubicación: `backups/`
   - Encoding: UTF-8

### Función `escapeSQLValue()`

Maneja correctamente:
- ✅ NULL y undefined → `NULL`
- ✅ Booleanos → `TRUE` / `FALSE`
- ✅ Números → sin comillas
- ✅ Strings → con comillas simples escapadas
- ✅ Arrays → `ARRAY[...]::text[]`
- ✅ Objetos JSON → `'...'::jsonb`

## 🔄 Restaurar Backup

### Opción 1: Supabase Dashboard (Recomendado)

1. Accede a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo `backup_mat89_YYYY-MM-DD.sql`
5. Ejecuta el script completo

### Opción 2: CLI de Supabase

```bash
# Si tienes Supabase CLI instalado
supabase db reset
supabase db push --file backups/backup_mat89_YYYY-MM-DD.sql
```

### Opción 3: psql (PostgreSQL Client)

```bash
psql -h db.xxxxx.supabase.co -p 5432 -U postgres -d postgres -f backups/backup_mat89_YYYY-MM-DD.sql
```

⚠️ **Nota**: Necesitarás las credenciales de conexión directa de Supabase.

## ⚠️ Consideraciones Importantes

### Antes de Restaurar

1. **⚠️ CUIDADO**: Restaurar un backup sobrescribirá los datos actuales
2. **Backup previo**: Haz un backup de la base actual antes de restaurar
3. **Usuarios de Auth**: La tabla `auth.users` NO se incluye (solo `user_profiles`)
4. **Foreign Keys**: El orden de las tablas respeta las dependencias

### Limitaciones

- ❌ No incluye tablas del schema `auth.*` (usuarios de Supabase Auth)
- ❌ No incluye triggers personalizados
- ❌ No incluye funciones SQL personalizadas
- ❌ No incluye policies de RLS (deben configurarse manualmente)

### Recomendaciones

- 📅 **Frecuencia**: Hacer backup antes de cambios importantes
- 🔒 **Seguridad**: Los archivos `.sql` están en `.gitignore` (no subirlos a git)
- 📊 **Tamaño**: Revisar el tamaño del backup (actual: ~8 KB)
- 🧪 **Testing**: Probar restauración en ambiente de pruebas primero

## 🔐 Seguridad

### ⚠️ MUY IMPORTANTE

Los archivos de backup contienen:
- ✅ Toda la estructura de la base de datos
- ✅ Todos los datos (pedidos, materiales, recepciones, etc.)
- ✅ Información de perfiles de usuario (emails, roles)

**NO subir backups a:**
- ❌ Repositorios públicos de GitHub
- ❌ Servicios de almacenamiento público
- ❌ Correos electrónicos no cifrados

**SÍ guardar en:**
- ✅ Almacenamiento local seguro
- ✅ Servicios de backup cifrados (Google Drive, Dropbox con 2FA)
- ✅ Servidores con acceso restringido

### Configuración de `.gitignore`

Ya está configurado para ignorar los backups:

```gitignore
# Backups de base de datos
backups/*.sql
```

Solo se sube `.gitkeep` para mantener la carpeta en git.

## 🛠️ Personalización

### Agregar Más Tablas

Editar `scripts/backup-database.js`:

```javascript
const TABLES = [
  'tbl_proveedores',
  'tbl_materiales',
  'tbl_pedidos_rep',
  'tbl_ln_pedidos_rep',
  'tbl_recepciones',
  'tbl_historico_cambios',
  'user_profiles',
  'tu_nueva_tabla_aqui'  // <-- Agregar aquí
];
```

### Cambiar Ubicación de Backups

Editar `scripts/backup-database.js`, línea ~380:

```javascript
const filepath = join(__dirname, '..', 'backups', filename);
// Cambiar a:
const filepath = join(__dirname, '..', 'otra-carpeta', filename);
```

### Filtrar Datos

Para excluir ciertos registros, modificar la función `generateInsertStatements()`:

```javascript
const { data, error } = await supabase
  .from(tableName)
  .select('*')
  .neq('status', 'BORRADO')  // <-- Agregar filtros
  .order('created_at', { ascending: true });
```

## 📊 Ejemplo de Salida

```
🚀 Iniciando backup de base de datos...

📊 Exportando datos de tbl_proveedores...
✅ tbl_proveedores: 12 registros exportados
📊 Exportando datos de tbl_materiales...
✅ tbl_materiales: 45 registros exportados
📊 Exportando datos de tbl_pedidos_rep...
✅ tbl_pedidos_rep: 8 registros exportados
📊 Exportando datos de tbl_ln_pedidos_rep...
✅ tbl_ln_pedidos_rep: 23 registros exportados
📊 Exportando datos de tbl_recepciones...
-- No hay datos en tbl_recepciones
📊 Exportando datos de tbl_historico_cambios...
✅ tbl_historico_cambios: 15 registros exportados
📊 Exportando datos de user_profiles...
-- No hay datos en user_profiles

✅ Backup generado exitosamente:
📁 Archivo: C:\...\mat89\backups\backup_mat89_2025-10-12.sql
📊 Tamaño: 7.86 KB

🎉 Proceso completado
```

## 🐛 Solución de Problemas

### Error: "Variables de entorno no configuradas"

**Causa**: Falta archivo `.env` o variables incorrectas

**Solución**:
```bash
# Verificar que existe .env
ls -la .env

# Contenido debe tener:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### Error: "Cannot find module 'dotenv'"

**Causa**: Dependencia no instalada

**Solución**:
```bash
npm install dotenv --save-dev
```

### Error al exportar tabla específica

**Causa**: Permisos insuficientes o tabla no existe

**Solución**:
1. Verificar que la tabla existe en Supabase
2. Verificar permisos RLS
3. Comentar temporalmente esa tabla en el array `TABLES`

### Backup vacío o muy pequeño

**Causa**: No hay datos o permisos RLS bloquean lectura

**Solución**:
1. Verificar que hay datos: `SELECT COUNT(*) FROM tabla`
2. Revisar policies de RLS en Supabase Dashboard
3. Usar Service Role Key en lugar de Anon Key (⚠️ solo en desarrollo)

## 📅 Estrategia de Backups Recomendada

### Frecuencia

- **Diario**: Si hay cambios frecuentes
- **Antes de migraciones**: Siempre
- **Antes de cambios mayores**: Estructura o RLS
- **Mensual**: Para histórico

### Retención

- Mantener últimos 7 días
- Mantener backup mensual del último año
- Archivar backups antiguos en almacenamiento externo

### Automatización (Avanzado)

Para automatizar backups diarios, usar:

**Windows (Task Scheduler)**:
```batch
cd C:\ruta\a\mat89
npm run backup
```

**Linux/Mac (Cron)**:
```bash
0 2 * * * cd /ruta/a/mat89 && npm run backup
```

## 🔗 Recursos Adicionales

- [Documentación de Supabase Backups](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL COPY Command](https://www.postgresql.org/docs/current/sql-copy.html)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## 📞 Soporte

Para problemas o dudas:
1. Revisar logs del script
2. Verificar permisos en Supabase
3. Consultar esta documentación

---

**💾 Sistema de Backup implementado con éxito**

**Fecha**: Octubre 2025
**Versión**: 1.0.0
**Implementado por**: Claude Code
