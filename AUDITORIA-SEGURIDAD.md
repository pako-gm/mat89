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

### 🚨 **ADVERTENCIA CRÍTICA - NO EJECUTAR CON USUARIOS ADMINISTRADORES REALES**

**NUNCA ejecutes las pruebas de seguridad con tu usuario administrador principal.** Las pruebas de escalación de privilegios intentan modificar roles de usuarios para detectar vulnerabilidades.

**Qué puede salir mal:**
- Si las políticas RLS tienen fallos (como ocurrió antes de la migración `20250113000000`), la prueba puede cambiar tu rol
- Aunque la prueba intenta restaurar el rol original, errores en la ejecución pueden dejarte con un rol incorrecto
- Podrías perder acceso a funcionalidades administrativas

**Mejores prácticas:**
1. **Crea un usuario de prueba** específico para auditorías con rol `CONSULTAS` o `EDICION`
2. Ejecuta las pruebas con ese usuario de prueba
3. Si necesitas probar con administrador, usa una cuenta secundaria, nunca tu cuenta principal
4. Verifica en el Panel de Control que tu rol sea correcto antes y después de ejecutar pruebas

**Restauración manual del rol:**
Si accidentalmente cambias tu rol, un administrador puede restaurarlo desde:
- Panel de Control > Gestión de Usuarios
- O directamente en Supabase Dashboard en la tabla `user_profiles`

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

## Vulnerabilidades Detectadas y Corregidas

### 🔴 **CVE-MAT89-2025-001: Escalación de Privilegios en user_profiles**

**Fecha de detección:** 2025-01-13
**Severidad:** CRÍTICA
**Estado:** ✅ CORREGIDA

**Descripción:**
Las políticas RLS de la tabla `user_profiles` permitían a cualquier usuario autenticado modificar TODOS los campos de su propio perfil, incluyendo el campo `user_role`. Esto permitía que un usuario con rol `CONSULTAS` pudiera auto-otorgarse el rol `ADMINISTRADOR`.

**Impacto:**
- Cualquier usuario podía obtener privilegios administrativos
- Bypasa completamente el sistema de control de acceso
- Permite acceso no autorizado a funciones administrativas
- Riesgo de modificación/eliminación de datos críticos

**Prueba que lo detectó:**
Test 5: Escalación de privilegios (`testPrivilegeEscalation()`)

**Solución implementada:**
Migración `20250113000000_fix_user_profiles_role_security.sql` que:
1. Elimina la política permisiva "Users can update own profile"
2. Crea política restrictiva que permite actualizar solo el nombre
3. Usa `WITH CHECK` para validar que `user_role` no cambie
4. Solo administradores pueden modificar roles

**Código de la política corregida:**
```sql
CREATE POLICY "Users can update own name only"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND user_role = (SELECT user_role FROM user_profiles WHERE user_id = auth.uid())
);
```

**Lecciones aprendidas:**
- NUNCA permitir que usuarios modifiquen campos críticos de seguridad
- Usar políticas granulares por columna
- Implementar `WITH CHECK` para validación adicional
- Las pruebas de seguridad deben restaurar el estado original correctamente

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

**Versión**: 1.1.0
**Última actualización**: 2025-01-13
**Mantenedor**: Equipo de desarrollo Mat89

## Changelog

### v1.1.0 (2025-01-13)
- 🔒 **SEGURIDAD**: Corregido bug crítico en testPrivilegeEscalation que hardcodeaba rol a CONSULTAS
- 🔒 **SEGURIDAD**: Implementada migración para corregir políticas RLS permisivas en user_profiles
- 📝 Agregada advertencia crítica sobre NO ejecutar pruebas con usuarios admin reales
- 📝 Documentada vulnerabilidad CVE-MAT89-2025-001 y su solución
- ✨ Mejora: Las pruebas ahora guardan y restauran el rol original del usuario

### v1.0.0 (2025-01-13)
- 🎉 Lanzamiento inicial de la herramienta de auditoría de seguridad
- ✅ 5 pruebas automatizadas implementadas
- 🎨 Interfaz integrada en Panel de Control
- 📊 Panel de resultados con recomendaciones automáticas
