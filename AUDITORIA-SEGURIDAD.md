# Auditoría de Seguridad - Mat89

## Descripción

La herramienta de Auditoría de Seguridad es una funcionalidad integrada en Mat89 que permite a los administradores realizar pruebas de seguridad sobre las políticas RLS (Row Level Security) y el control de acceso de la base de datos Supabase.

## Acceso

La auditoría de seguridad está disponible **exclusivamente para usuarios con rol ADMINISTRADOR** a través del menú de navegación:

1. Inicia sesión como administrador
2. Expande el menú **"Panel de Control"** en el sidebar
3. Selecciona **"Auditoría de Seguridad"**

## Características

### 🔒 Pruebas Implementadas

1. **Test 1: Acceso sin autenticación**
   - Verifica que las tablas protegidas no sean accesibles sin autenticación
   - Tabla evaluada: `tbl_pedidos_rep`

2. **Test 2: Políticas de documentos**
   - Comprueba la protección de documentos sensibles
   - Tabla evaluada: `tbl_documentos_pedido`

3. **Test 3: Tabla sin políticas**
   - Detecta tablas sin políticas RLS configuradas
   - Tabla evaluada: `tbl_prov_contactos`

4. **Test 4: Políticas de roles**
   - Valida que los roles restrinjan correctamente las operaciones de escritura
   - Tabla evaluada: `tbl_materiales`

5. **Test 5: Escalación de privilegios**
   - Verifica que los usuarios no puedan modificar sus propios roles
   - Tabla evaluada: `user_profiles`

### 📊 Panel de Resultados

- **Resumen visual**: Muestra contadores de problemas críticos, errores, advertencias y pruebas correctas
- **Resultados detallados**: Cada prueba incluye:
  - Icono de estado (✓ éxito, ⚠ advertencia, ✗ error, 🚨 crítico)
  - Descripción del resultado
  - Detalles técnicos expandibles
- **Recomendaciones automáticas**: Sugerencias específicas basadas en los problemas detectados

### 🎨 Interfaz

- **Diseño moderno**: UI consistente con el resto de la aplicación Mat89
- **Estados visuales**: Indicadores de conexión y progreso
- **Responsive**: Adaptable a diferentes tamaños de pantalla

## Niveles de Severidad

| Nivel | Color | Descripción |
|-------|-------|-------------|
| **🚨 CRÍTICO** | Rojo | Vulnerabilidad grave que requiere atención inmediata |
| **✗ ERROR** | Naranja | Problema de seguridad que debe corregirse pronto |
| **⚠ ADVERTENCIA** | Amarillo | Posible problema que requiere revisión |
| **✓ ÉXITO** | Verde | La prueba pasó correctamente |

## Uso

### Ejecutar todas las pruebas

1. Navega a **Panel de Control > Auditoría de Seguridad**
2. Verifica que el estado de conexión sea "Conectado a Supabase"
3. Haz clic en el botón **"Ejecutar Todas las Pruebas"**
4. Espera a que se completen las pruebas (aproximadamente 3-5 segundos)
5. Revisa los resultados y recomendaciones

### Interpretar resultados

- **0 críticos y 0 errores**: Tu aplicación tiene una seguridad sólida
- **1+ críticos**: Requiere atención inmediata, vulnerabilidades graves detectadas
- **1+ errores**: Problemas que deben solucionarse para mejorar la seguridad
- **Solo advertencias**: Configuración aceptable, pero con puntos de mejora

## Recomendaciones Generales

Cuando se detectan problemas, la herramienta proporciona recomendaciones específicas como:

- Revisar políticas RLS de tablas específicas
- Crear políticas faltantes
- Implementar validación de `ambito_almacenes`
- Restringir acceso a tablas de administración
- Implementar rate limiting
- Activar logs de auditoría en Supabase
- Configurar autenticación de dos factores (2FA)

## Consideraciones de Seguridad

⚠️ **IMPORTANTE**:
- Esta herramienta está diseñada **SOLO** para probar **TU PROPIA** aplicación
- No uses esta herramienta en sistemas de terceros sin autorización
- Es una herramienta de auditoría ética con fines de mejora de seguridad
- Los resultados se generan en tiempo real y no se almacenan

## Arquitectura Técnica

### Stack Tecnológico

- **Frontend**: React + TypeScript
- **UI Components**: Custom components + Lucide icons
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Routing**: React Router v6

### Integración

La página está integrada en el flujo de la aplicación:

```
src/
  pages/
    SecurityAuditPage.tsx      # Componente principal
  components/
    layout/
      Sidebar.tsx              # Menú lateral (incluye enlace)
  App.tsx                      # Rutas protegidas
```

### Protección de Ruta

```typescript
<Route
  path="auditoria-seguridad"
  element={
    <ProtectedRoute requiredRole="ADMINISTRADOR">
      <SecurityAuditPage />
    </ProtectedRoute>
  }
/>
```

## Futuras Mejoras

Posibles expansiones de la herramienta:

- [ ] Exportar resultados a PDF
- [ ] Historial de auditorías
- [ ] Pruebas de inyección SQL
- [ ] Pruebas de XSS
- [ ] Análisis de permisos de storage
- [ ] Validación de políticas de Edge Functions
- [ ] Alertas automáticas por email
- [ ] Integración con sistemas de monitoreo

## Soporte

Para reportar problemas o sugerir mejoras:
- Contacta al equipo de desarrollo de Mat89
- Revisa la documentación de Supabase sobre RLS: https://supabase.com/docs/guides/auth/row-level-security

---

**Versión**: 1.0.0
**Última actualización**: 2025-01-13
**Mantenedor**: Equipo de desarrollo Mat89
