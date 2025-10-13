@echo off
REM ============================================
REM Backup Automático Diario - Mat89
REM ============================================

echo.
echo ========================================
echo    BACKUP AUTOMATICO - Mat89
echo ========================================
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM Ejecutar el backup
echo Ejecutando backup...
node scripts\backup-standalone.js

REM Verificar si fue exitoso
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    BACKUP COMPLETADO
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo    ERROR EN EL BACKUP
    echo ========================================
    echo.
    pause
    exit /b 1
)

REM No pausar si se ejecuta automáticamente (sin interacción)
REM Si quieres que se pause, descomenta la siguiente línea:
REM pause
