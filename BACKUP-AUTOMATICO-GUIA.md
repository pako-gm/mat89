# 🔄 Guía Completa: Backup Automático de Base de Datos

## 📋 Resumen

Sistema completo de backup automático para Mat89 con múltiples opciones de ejecución:
- ✅ Ejecutable manual (.bat)
- ✅ Backup automático programado (diario)
- ✅ Script standalone mejorado
- ✅ Gestión automática de backups antiguos

## 🚀 Opción 1: Backup Manual (Más Simple)

### Ejecutar Backup Manualmente

**Doble click en:** `backup-diario.bat`

```
========================================
   BACKUP AUTOMATICO - Mat89
========================================

Ejecutando backup...

═══════════════════════════════════════
    BACKUP AUTOMÁTICO - Mat89 Database
═══════════════════════════════════════

Progreso del Backup:
  tbl_almacenes            [████████████████████] 100% - 5 registros
  tbl_proveedores          [████████████████████] 100% - 12 registros
  tbl_materiales           [████████████████████] 100% - 45 registros
  ...

✓ Backup completado exitosamente!
📁 Archivo: backup_mat89_2025-10-12_1697123456789.sql
📊 Tamaño: 127.45 KB
📝 Líneas: 3,421
📦 Tablas: 8
```

### Características del Script Manual

- ✅ Interfaz visual con colores
- ✅ Barra de progreso por tabla
- ✅ Timestamp único en el nombre del archivo
- ✅ Información detallada del backup
- ✅ Gestión automática (mantiene últimos 10 backups)

## ⏰ Opción 2: Backup Automático Programado (Recomendado)

### Instalación en 3 Pasos

#### Paso 1: Ejecutar Instalador

1. **Click derecho** en: `instalar-backup-automatico.bat`
2. Seleccionar: **"Ejecutar como administrador"**
3. Confirmar con: **S** (Sí)

```
========================================
   INSTALADOR DE BACKUP AUTOMATICO
========================================

Permisos de administrador: OK

¿Desea instalar el backup automático diario? (S/N): S

Creando tarea programada...

========================================
   INSTALACION COMPLETADA
========================================

Tarea programada creada exitosamente:
  Nombre: Mat89 Backup Diario
  Frecuencia: Todos los días
  Hora: 02:00 AM
  Usuario: tu_usuario
```

#### Paso 2: Verificar Instalación

**Windows + R** → Escribir: `taskschd.msc` → Enter

Buscar: **"Mat89 Backup Diario"**

#### Paso 3: Configurar (Opcional)

Puedes cambiar:
- Hora de ejecución
- Frecuencia (semanal, mensual, etc.)
- Condiciones (solo si hay conexión a red, etc.)

### Personalizar Horario

Si quieres cambiar la hora del backup:

1. Abre el instalador: `instalar-backup-automatico.bat`
2. Edita la línea (busca `/st 02:00`):

```batch
/st 02:00  →  /st 23:00  (para ejecutar a las 11 PM)
```

3. Ejecuta nuevamente como administrador

## 🛠️ Opción 3: Script Avanzado (Desarrolladores)

### Ejecutar Directamente

```bash
node scripts/backup-standalone.js
```

### Características Avanzadas

✅ **Barra de Progreso en Tiempo Real**
```
Progreso del Backup:
  tbl_almacenes            [████████████████████] 100%
  tbl_proveedores          [██████████████░░░░░░]  70%
  tbl_materiales           [░░░░░░░░░░░░░░░░░░░░]   0%
```

✅ **Gestión Inteligente de Backups**
- Mantiene últimos 10 backups automáticamente
- Elimina los más antiguos

✅ **Manejo de Errores Robusto**
- Si una tabla no existe, la omite
- Continúa con las demás tablas
- Registra errores detallados

✅ **Nombres de Archivo Únicos**
```
backup_mat89_2025-10-12_1697123456789.sql
                ^fecha    ^timestamp único
```

## 📁 Estructura de Archivos Creados

```
mat89/
├── backup-diario.bat                    ⭐ Ejecutable manual
├── instalar-backup-automatico.bat       ⭐ Instalador automático
├── scripts/
│   ├── backup-database.js               (Script original)
│   └── backup-standalone.js             ⭐ Script mejorado
├── backups/
│   ├── backup_mat89_2025-10-12_xxx.sql  ← Backups aquí
│   ├── backup_mat89_2025-10-11_xxx.sql
│   └── ... (últimos 10 backups)
└── BACKUP-AUTOMATICO-GUIA.md           (este archivo)
```

## ⚙️ Configuración Avanzada

### Cambiar Número de Backups a Mantener

Editar `scripts/backup-standalone.js`, línea ~40:

```javascript
const CONFIG = {
  maxBackups: 10,  // Cambiar a 20, 30, etc.
  ...
};
```

### Cambiar Ubicación de Backups

Editar `scripts/backup-standalone.js`, línea ~39:

```javascript
backupDir: 'C:\\MisBackups\\Mat89',  // Ruta personalizada
```

### Agregar Más Tablas al Backup

Editar `scripts/backup-standalone.js`, línea ~29:

```javascript
tables: [
  'tbl_almacenes',
  'tbl_proveedores',
  // ... otras tablas
  'tu_nueva_tabla_aqui',  // ← Agregar aquí
],
```

## 🔍 Verificación y Monitoreo

### Ver Historial de Backups

```bash
dir backups\*.sql /od
```

Muestra todos los backups ordenados por fecha

### Ver Tamaño Total de Backups

```bash
dir backups\*.sql
```

### Verificar Última Ejecución Automática

**Windows + R** → `taskschd.msc`

1. Buscar: "Mat89 Backup Diario"
2. Click derecho → **Historial**
3. Ver últimas ejecuciones

## 🧪 Prueba del Sistema

### Test 1: Backup Manual

```bash
# Ejecutar
backup-diario.bat

# Verificar que se creó el archivo
dir backups\backup_mat89_*.sql
```

### Test 2: Backup Automático

1. Cambiar hora a dentro de 2 minutos
2. Esperar
3. Verificar que se ejecutó automáticamente

### Test 3: Restauración

1. Abrir Supabase SQL Editor
2. Abrir archivo `.sql` generado
3. Copiar y pegar contenido
4. Ejecutar (en ambiente de prueba)

## 📊 Comparativa de Opciones

| Característica | Manual (.bat) | Automático | Script Node |
|----------------|---------------|------------|-------------|
| Fácil de usar | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Configuración | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Automatización | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Flexibilidad | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Visual | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🔐 Seguridad

### ⚠️ Importante

Los backups contienen:
- ✅ Toda la estructura de la BD
- ✅ Todos los datos de las tablas
- ✅ Información sensible (emails, roles, etc.)

### Recomendaciones

1. **NO subir backups a git** ✅ (ya configurado en .gitignore)
2. **Guardar en lugar seguro**
   - Disco externo
   - Nube cifrada (Google Drive, OneDrive)
   - Servidor con acceso restringido

3. **Encriptar backups sensibles** (opcional)
   ```bash
   # Ejemplo con 7-Zip
   7z a -p backup_encrypted.7z backup_mat89_*.sql
   ```

## 🆘 Solución de Problemas

### Error: "Variables de entorno no configuradas"

**Causa:** Falta archivo `.env`

**Solución:**
```bash
# Verificar que existe
dir .env

# Debe contener:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### Error: "No se puede crear la tarea programada"

**Causa:** Sin permisos de administrador

**Solución:**
1. Click derecho en `instalar-backup-automatico.bat`
2. "Ejecutar como administrador"

### Error: "Tabla no existe"

**Causa:** Tabla no creada en Supabase

**Solución:**
El script omite tablas que no existen y continúa con las demás

### Backup muy lento

**Posible causa:** Muchos datos

**Solución:**
1. Ver progreso en tiempo real
2. Considerar backup incremental (solo cambios)
3. Comprimir backups antiguos

## 📅 Estrategia de Backup Recomendada

### Para Producción

**Diario:**
- Automático a las 2:00 AM
- Mantener últimos 10 días

**Semanal:**
- Guardar backup del domingo en ubicación separada
- Mantener últimas 8 semanas

**Mensual:**
- Guardar backup del último día del mes
- Mantener últimos 12 meses
- Archivar en nube

### Script para Backups Semanales

Crear `backup-semanal.bat`:
```batch
@echo off
node scripts\backup-standalone.js
REM Copiar a ubicación especial
copy "backups\backup_mat89_*.sql" "D:\Backups_Semanales\"
```

## 🔗 Integración con Otros Sistemas

### Notificación por Email (Avanzado)

Agregar al final de `backup-standalone.js`:

```javascript
// Enviar email con Nodemailer
const nodemailer = require('nodemailer');
// ... código de envío de email
```

### Subir a la Nube (Avanzado)

```javascript
// Subir a Google Drive, Dropbox, etc.
// Usar APIs respectivas
```

### Webhook de Notificación

```javascript
// POST a Slack, Discord, etc.
fetch('https://hooks.slack.com/services/...');
```

## 📚 Referencias

- [Windows Task Scheduler Docs](https://docs.microsoft.com/en-us/windows/win32/taskschd)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
- [Supabase Backup Best Practices](https://supabase.com/docs/guides/platform/backups)

## ✅ Checklist de Implementación

- [ ] Probar backup manual (`backup-diario.bat`)
- [ ] Instalar backup automático (como administrador)
- [ ] Verificar tarea en Task Scheduler
- [ ] Esperar primera ejecución automática
- [ ] Verificar archivo generado en `/backups`
- [ ] Documentar ubicación de backups al equipo
- [ ] Establecer política de retención
- [ ] Configurar backup secundario (opcional)

---

**🎉 Sistema de Backup Automático Implementado**

**Fecha**: Octubre 2025
**Versión**: 2.0
**Implementado por**: Claude Code
