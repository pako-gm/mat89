@echo off
REM ============================================
REM Instalador de Backup Automático - Windows Task Scheduler
REM ============================================

echo.
echo ========================================
echo    INSTALADOR DE BACKUP AUTOMATICO
echo ========================================
echo.
echo Este script configurara un backup automatico
echo que se ejecutara todos los dias a las 2:00 AM
echo.

REM Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: Se requieren permisos de administrador
    echo.
    echo Por favor:
    echo 1. Click derecho en este archivo
    echo 2. Seleccionar "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo Permisos de administrador: OK
echo.

REM Obtener ruta completa del proyecto
set PROJECT_PATH=%~dp0
set BACKUP_SCRIPT=%PROJECT_PATH%backup-diario.bat

echo Ruta del proyecto: %PROJECT_PATH%
echo Script de backup: %BACKUP_SCRIPT%
echo.

REM Preguntar confirmación
set /p CONFIRMAR="¿Desea instalar el backup automático diario? (S/N): "
if /i not "%CONFIRMAR%"=="S" (
    echo Instalación cancelada
    pause
    exit /b 0
)

echo.
echo Creando tarea programada...
echo.

REM Eliminar tarea anterior si existe
schtasks /delete /tn "Mat89 Backup Diario" /f >nul 2>&1

REM Crear nueva tarea programada
schtasks /create ^
    /tn "Mat89 Backup Diario" ^
    /tr "\"%BACKUP_SCRIPT%\"" ^
    /sc daily ^
    /st 02:00 ^
    /ru "%USERNAME%" ^
    /rl HIGHEST ^
    /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    INSTALACION COMPLETADA
    echo ========================================
    echo.
    echo Tarea programada creada exitosamente:
    echo   Nombre: Mat89 Backup Diario
    echo   Frecuencia: Todos los días
    echo   Hora: 02:00 AM
    echo   Usuario: %USERNAME%
    echo.
    echo Para ver/editar la tarea:
    echo   1. Presiona Win + R
    echo   2. Escribe: taskschd.msc
    echo   3. Busca: "Mat89 Backup Diario"
    echo.
    echo Para ejecutar el backup manualmente ahora:
    echo   Ejecuta: backup-diario.bat
    echo.
) else (
    echo.
    echo ========================================
    echo    ERROR EN LA INSTALACION
    echo ========================================
    echo.
    echo No se pudo crear la tarea programada.
    echo Código de error: %ERRORLEVEL%
    echo.
)

pause
