# 🚀 Activar Backups Automáticos - Guía Rápida

## ✅ Lo que acabas de obtener

1. ✅ Sistema de backups manual desde la web (`/backup-sistema`)
2. ✅ GitHub Actions configurado para backups semanales
3. ✅ Integración con OneDrive Empresarial

---

## 📋 Pasos para Activar

### PASO 1: Configurar GitHub Secrets

1. Ve a: https://github.com/TU_USUARIO/mat89/settings/secrets/actions

2. Agrega estos 2 secrets (si no los tienes ya):

   **Secret 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://mlisnngduwrlqxyjjibp.supabase.co` (tu URL de Supabase)

   **Secret 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: (tu clave anon de Supabase, la del archivo `.env`)

3. **Opcional** - Para OneDrive en GitHub Actions:
   - Sigue instrucciones en `scripts/setup-onedrive-backup.md`
   - Agrega secret: `ONEDRIVE_RCLONE_CONFIG`

---

### PASO 2: Hacer Commit y Push

```bash
git add .github/workflows/weekly-backup.yml
git add scripts/setup-onedrive-backup.md
git add BACKUP-SETUP.md
git commit -m "feat: Configuración de backups automáticos semanales"
git push origin BACKUP-DATOS
```

---

### PASO 3: Probar GitHub Action Manualmente

1. Ve a: https://github.com/TU_USUARIO/mat89/actions
2. Selecciona "Backup Semanal Automático"
3. Clic en "Run workflow" → "Run workflow"
4. Espera 2-3 minutos
5. Verifica:
   - ✅ Workflow completado exitosamente (check verde)
   - ✅ Nuevo Release creado con archivo SQL
   - ✅ (Opcional) Archivo en OneDrive si configuraste rclone

---

### PASO 4: Configurar Guardado Local en OneDrive (Opcional)

**Si quieres que los backups manuales se guarden en OneDrive:**

1. Identifica tu carpeta de OneDrive:
   ```
   C:\Users\Usuario\OneDrive - NombreEmpresa\
   ```

2. Crea carpeta:
   ```
   C:\Users\Usuario\OneDrive - NombreEmpresa\Backups\MAT89\
   ```

3. Edita `scripts/backup-standalone.js` (línea ~94):
   ```javascript
   // Cambiar de:
   const backupsDir = path.join(__dirname, '..', 'backups');

   // A:
   const backupsDir = 'C:\\Users\\Usuario\\OneDrive - TuEmpresa\\Backups\\MAT89';
   ```

4. Prueba:
   ```bash
   npm run backup
   ```

---

## 📅 Configuración de Horarios

### GitHub Actions (Archivo: `.github/workflows/weekly-backup.yml`)

**Línea 6** - Cron schedule:
```yaml
- cron: '0 3 * * 0'  # Domingo 3:00 AM UTC
```

**Cambiar horario:**
- Lunes 2:00 AM: `'0 2 * * 1'`
- Viernes 23:00: `'0 23 * * 5'`
- Cada día 4:00 AM: `'0 4 * * *'`

Formato: `minuto hora día-mes mes día-semana` (0=Domingo, 1=Lunes...)

---

## 🎯 Resumen Final

| Tipo | Frecuencia | Dónde se guarda | Requiere PC |
|------|------------|-----------------|-------------|
| **Manual Web** | Cuando quieras | Navegador (descarga) | ✅ |
| **GitHub Actions** | Semanal (domingo 3 AM) | GitHub Releases | ❌ |
| **GitHub + OneDrive** | Semanal | OneDrive + Releases | ❌ |
| **Task Scheduler** | Diario/Semanal | Carpeta local/OneDrive | ✅ |

---

## 🆘 Troubleshooting

### Error: "Resource not accessible by integration"
- Verifica que los secrets estén correctamente configurados
- Ve a Settings → Actions → General → Workflow permissions
- Selecciona "Read and write permissions"

### GitHub Action no aparece
- Asegúrate de hacer push de `.github/workflows/weekly-backup.yml`
- Espera 1-2 minutos después del push

### Backup no se sube a OneDrive
- Verifica que el secret `ONEDRIVE_RCLONE_CONFIG` esté configurado
- Comprueba que la configuración de rclone sea correcta

---

## 📞 Documentación Adicional

- GitHub Actions: `.github/workflows/weekly-backup.yml`
- OneDrive Setup: `scripts/setup-onedrive-backup.md`
- Script de Backup: `scripts/backup-standalone.js`
- Página Web: `src/pages/BackupSistema.tsx`

---

**¡Todo listo!** 🎉

Tu sistema ahora tiene backups automáticos cada domingo a las 3 AM, guardados en GitHub Releases y opcionalmente en OneDrive.
