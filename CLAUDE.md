# CLAUDE.md - Material Repair Management System

## 📋 Visión General del Proyecto

Sistema de gestión de reparaciones de materiales construido con React, TypeScript, Vite y Supabase. Este proyecto gestiona el ciclo completo de reparaciones, incluyendo garantías, pedidos, y seguimiento de materiales.

**Rama actual**: GARANTIAS-REPARACION
**Rama principal**: main

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

- **Frontend**: React 18.3 + TypeScript 5.5
- **Build Tool**: Vite 5.4
- **Styling**: TailwindCSS 3.4 con tailwindcss-animate
- **UI Components**: Radix UI (Dialog, Select, Toast, Avatar, etc.)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Router**: React Router DOM 6.22
- **Utilidades**:
  - date-fns para manejo de fechas
  - xlsx para exportación a Excel
  - jspdf + html2canvas para generación de PDFs
  - lucide-react para iconos

### Estructura de Directorios

```
mat89/
├── src/
│   ├── components/      # Componentes reutilizables UI
│   ├── pages/          # Páginas/vistas principales
│   ├── hooks/          # React hooks personalizados
│   ├── lib/            # Utilidades y configuración
│   ├── types/          # Definiciones TypeScript
│   ├── App.tsx         # Componente principal
│   └── main.tsx        # Punto de entrada
├── scripts/            # Scripts de utilidad (backups, etc.)
├── SQL/                # Migraciones y queries SQL
├── supabase/           # Configuración de Supabase
├── backups/            # Backups automáticos de base de datos
├── public/             # Assets estáticos
└── dist/               # Build de producción
```

---

## 🚀 Comandos Principales

### Desarrollo
```bash
npm run dev          # Inicia servidor de desarrollo
npm run build        # Compila para producción
npm run preview      # Preview del build de producción
npm run lint         # Ejecuta ESLint
```

### Backups
```bash
npm run backup                  # Backup de base de datos (Node.js)
npm run backup:standalone       # Backup standalone
backup-diario.bat              # Backup automático (Windows)
instalar-backup-automatico.bat # Configura tarea programada de backup
```

---

## 🗄️ Base de Datos (Supabase)

### Tablas Principales

El sistema gestiona las siguientes entidades principales:

- **Usuarios y Autenticación**: Sistema de usuarios con roles
- **Materiales**: Catálogo de materiales reparables
- **Reparaciones**: Órdenes de reparación con estados
- **Garantías**: Gestión de garantías externas/internas
- **Pedidos**: Sistema de pedidos relacionados con reparaciones
- **Versiones**: Sistema de control de versiones del programa

### Migraciones Recientes

El proyecto incluye un sistema de gestión de versiones completo con operaciones CRUD y limpieza de tablas legacy.

---

## 🔑 Funcionalidades Principales

### 1. Gestión de Reparaciones
- Creación y seguimiento de órdenes de reparación
- Estados del ciclo de vida de reparaciones
- Asignación de técnicos y materiales

### 2. Sistema de Garantías
- **Fase 1 implementada**: Línea única de pedido cuando `es_externo = TRUE`
- Seguimiento de garantías internas y externas
- Historial de reparaciones bajo garantía

### 3. Gestión de Pedidos
- Creación de pedidos vinculados a reparaciones
- Seguimiento de estado de pedidos
- Integración con proveedores externos

### 4. Control de Versiones
- Sistema completo de historial de versiones
- UI para visualización de cambios
- CRUD de versiones del programa

### 5. Exportaciones
- Exportación a Excel (xlsx)
- Generación de PDFs con html2canvas y jspdf
- Informes personalizables

### 6. Sistema de Autenticación
- Login/logout con Supabase Auth
- Reset de contraseña con mensajes en español
- Gestión de estado de usuarios

---

## 🔧 Configuración del Entorno

### Variables de Entorno (.env)

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

**Nota**: El archivo `.env` está en `.gitignore` por seguridad.

### Configuración de Vercel

El proyecto incluye `vercel.json` para manejo correcto de rutas SPA en producción.

---

## 📝 Últimos Cambios (Commits Recientes)

1. **Limpieza de tablas legacy**: Eliminadas tablas no utilizadas con migración de cleanup
2. **Garantías Fase 1**: Implementación de línea única de pedido para externos
3. **Sistema de versiones**: Gestión completa con UI y operaciones CRUD
4. **Internacionalización**: Mensajes de error traducidos al español
5. **Fix producción**: Corrección de 404 en reset de password

---

## 🔍 Patrones y Convenciones

### Componentes
- Uso de componentes funcionales con hooks
- Radix UI para componentes base con accesibilidad
- TailwindCSS con class-variance-authority para variantes

### Estado
- React hooks (useState, useEffect, useContext)
- Context API para estado global cuando es necesario

### Tipos TypeScript
- Interfaces definidas en `src/types/`
- Tipado estricto habilitado

### Estilos
- Utility-first con TailwindCSS
- Componentes estilizados con clsx y tailwind-merge
- Animaciones con tailwindcss-animate

---

## 🐛 Debugging

### Logs y Errores
- Vercel Analytics integrado para producción
- Console logs para desarrollo
- Error boundaries recomendados para componentes críticos

### Herramientas de Desarrollo
- React DevTools
- Vite HMR (Hot Module Replacement)
- ESLint con configuración personalizada

---

## 📦 Despliegue

### Producción (Vercel)
```bash
npm run build    # Genera dist/
# Vercel detecta automáticamente la configuración
```

### Build Local
```bash
npm run build
npm run preview  # Prueba el build localmente
```

---

## 🔐 Seguridad

- Autenticación manejada por Supabase
- Variables de entorno para credenciales
- Row Level Security (RLS) en Supabase
- Sanitización de inputs en formularios

---

## 📚 Recursos Adicionales

### Documentación de Dependencias Clave
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/docs)
- [TailwindCSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)

### Scripts Personalizados
- **backup-database.js**: Backup automatizado de Supabase
- **backup-standalone.js**: Backup independiente
- **backup-diario.bat**: Tarea programada de Windows

---

## 🎯 Próximos Pasos / TODOs

- [ ] Completar Fase 2 de Garantías/Reparaciones
- [ ] Añadir tests unitarios y de integración
- [ ] Documentar API endpoints de Supabase
- [ ] Mejorar manejo de errores global
- [ ] Optimizar bundle size

---

## 👤 Colaboración con Claude Code

### Comandos Útiles para Claude
```bash
# Buscar en el código
grep -r "patrón" src/

# Listar estructura
ls -R src/

# Ver cambios git
git status
git diff

# Ejecutar build
npm run build
```

### Contexto Importante
- Este es un proyecto activo en desarrollo
- Rama actual trabajando en Garantías/Reparaciones
- Base de datos en Supabase con migraciones controladas
- Backups automáticos configurados

---

## 📞 Notas Finales

**Proyecto**: Sistema de Gestión de Reparaciones de Material
**Entorno**: Windows (Bash/Git Bash disponible)
**IDE**: VSCode
**Node**: Compatible con polyfills para navegador (stream, buffer, process)

---

*Documento generado para facilitar la colaboración con Claude Code*
*Última actualización: 2025-11-12*
