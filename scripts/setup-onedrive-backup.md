# Configuración de Backups Automáticos a OneDrive Empresarial

Este documento explica cómo configurar backups automáticos que se guarden en OneDrive sin usar Azure.

## 📋 Opción 1: Guardar en Carpeta Sincronizada de OneDrive (MÁS SIMPLE)

### Pasos:

1. **Identificar tu carpeta de OneDrive**:
   ```
   C:\Users\TuUsuario\OneDrive - NombreEmpresa\
   ```

2. **Crear carpeta de destino**:
   ```
   C:\Users\TuUsuario\OneDrive - NombreEmpresa\Backups\MAT89\
   ```

3. **Modificar `backup-standalone.js`**:

   Busca esta línea (aprox. línea 94):
   ```javascript
   const backupsDir = path.join(__dirname, '..', 'backups');
   ```

   Cámbiala por:
   ```javascript
   const backupsDir = 'C:\\Users\\TuUsuario\\OneDrive - NombreEmpresa\\Backups\\MAT89';
   ```

4. **Ejecutar backup de prueba**:
   ```bash
   npm run backup
   ```

5. **Verificar**:
   - El archivo SQL debería aparecer en OneDrive
   - Se sincronizará automáticamente a la nube

### Ventajas:
- ✅ No requiere configuración adicional
- ✅ Sincronización automática de OneDrive
- ✅ Accesible desde cualquier dispositivo
- ✅ Funciona con Task Scheduler

---

## 📋 Opción 2: Usar rclone (Para GitHub Actions)

### Instalación Local:

1. **Descargar rclone**:
   - Ve a: https://rclone.org/downloads/
   - Descarga la versión para Windows
   - Extrae `rclone.exe` a `C:\Windows\System32\`

2. **Configurar OneDrive**:
   ```bash
   rclone config
   ```

   Sigue estos pasos:
   ```
   n) New remote
   name> onedrive
   Storage> 23 (Microsoft OneDrive)
   client_id> [Dejar en blanco - Enter]
   client_secret> [Dejar en blanco - Enter]
   region> 1 (Microsoft Cloud Global)
   Edit advanced config? n
   Use auto config? Y (esto abrirá navegador)
   ```

3. **Autorizar en navegador**:
   - Inicia sesión con tu cuenta empresarial
   - Acepta permisos
   - Cierra navegador

4. **Verificar configuración**:
   ```bash
   rclone lsd onedrive:
   ```

5. **Probar subida**:
   ```bash
   rclone copy backups/ onedrive:Backups/MAT89/ --progress
   ```

### Configurar en GitHub Actions:

1. **Exportar configuración de rclone**:
   ```bash
   cat ~/.config/rclone/rclone.conf
   ```
   (En Windows: `type %USERPROFILE%\.config\rclone\rclone.conf`)

2. **Copiar contenido completo**

3. **Agregar a GitHub Secrets**:
   - Ve a: https://github.com/TU_USUARIO/mat89/settings/secrets/actions
   - Clic en "New repository secret"
   - Name: `ONEDRIVE_RCLONE_CONFIG`
   - Value: [Pegar contenido del archivo rclone.conf]
   - Guardar

4. **Agregar credenciales de Supabase** (si no están):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Ventajas:
- ✅ Funciona desde GitHub Actions (sin PC)
- ✅ Backups directos a OneDrive
- ✅ No requiere Azure

---

## 🤖 Opción 3: Script PowerShell con OneDrive

Crea `scripts/backup-to-onedrive.ps1`:

```powershell
# Ejecutar backup
npm run backup

# Buscar carpeta de OneDrive
$onedrivePath = Get-ItemPropertyValue -Path "HKCU:\Software\Microsoft\OneDrive\Accounts\Business1" -Name "UserFolder"

# Crear carpeta destino
$backupDestination = Join-Path $onedrivePath "Backups\MAT89"
New-Item -ItemType Directory -Force -Path $backupDestination

# Copiar backups
Copy-Item -Path "backups\*.sql" -Destination $backupDestination -Force

Write-Host "Backups copiados a OneDrive: $backupDestination"
```

Ejecutar:
```bash
powershell -ExecutionPolicy Bypass -File scripts/backup-to-onedrive.ps1
```

---

## 📅 Programar en Windows Task Scheduler

### Para Opción 1 (Carpeta Sincronizada):

1. Ya está configurado con `instalar-backup-automatico.bat`
2. Solo necesitas cambiar la ruta en `backup-standalone.js`
3. Los archivos se guardarán directamente en OneDrive

### Para Opción 3 (Script PowerShell):

1. Abre Task Scheduler
2. Edita la tarea existente o crea nueva
3. **Action**:
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\ruta\a\mat89\scripts\backup-to-onedrive.ps1"`

---

## 🎯 Recomendación

**Para tu caso (OneDrive Empresarial sin Azure):**

1. **Usa Opción 1** (Carpeta Sincronizada) para backups locales con Task Scheduler
2. **Usa Opción 2** (rclone) para GitHub Actions

**Esto te da**:
- ✅ Backups automáticos semanales desde GitHub Actions
- ✅ Backups guardados en GitHub Releases
- ✅ Backups subidos automáticamente a OneDrive
- ✅ Todo sin Azure, completamente desatendido

---

## 🔧 Cambios Necesarios en el Código

Si eliges Opción 1, modifica `scripts/backup-standalone.js`:

```javascript
// Línea ~94
// ANTES:
const backupsDir = path.join(__dirname, '..', 'backups');

// DESPUÉS:
const oneDrivePath = process.env.ONEDRIVE_PATH ||
  'C:\\Users\\Usuario\\OneDrive - TuEmpresa\\Backups\\MAT89';
const backupsDir = oneDrivePath;
```

---

**¿Qué opción prefieres implementar?** 🚀
