# Configuración de Supabase para Recuperación de Contraseña

## Problema Identificado

Cuando un usuario hace clic en el enlace de recuperación de contraseña enviado por Supabase, la aplicación no redirigía automáticamente a la página de reset de contraseña (`/reset-password`).

## Solución Implementada

Se ha implementado una solución en dos partes:

### 1. Código de la Aplicación (✅ COMPLETADO)

Se agregó un componente `PasswordRecoveryHandler` en [App.tsx](src/App.tsx#L72-L94) que:

- Detecta automáticamente cuando Supabase redirige con un token de recuperación en el hash de la URL
- Verifica si hay parámetros `access_token` y `type=recovery` en el hash
- Redirige automáticamente a `/reset-password` cuando se detecta un token de recuperación

**Archivos modificados:**
- [src/App.tsx](src/App.tsx) - Agregado `PasswordRecoveryHandler` y lógica de detección

### 2. Configuración de Supabase (⚠️ PENDIENTE - REQUIERE ACCIÓN)

Para que el flujo funcione correctamente, es necesario verificar la configuración en el dashboard de Supabase:

#### Pasos a seguir:

1. **Acceder al Dashboard de Supabase**
   - Ir a https://app.supabase.com
   - Seleccionar tu proyecto

2. **Configurar Authentication > URL Configuration**
   - Navegar a: `Authentication` → `URL Configuration`
   - Verificar/configurar las siguientes URLs:

   **Site URL:**
   ```
   https://mat89.vercel.app
   ```

   **Redirect URLs (agregar todas estas):**
   ```
   https://mat89.vercel.app/reset-password
   https://mat89.vercel.app/login
   http://localhost:5173/reset-password
   http://localhost:5173/login
   ```

3. **Guardar cambios**
   - Hacer clic en "Save"
   - Esperar unos segundos para que los cambios se propaguen

## Flujo de Recuperación de Contraseña (Actualizado)

1. ✅ Usuario hace clic en "¿Olvidaste tu contraseña?" en la página de login
2. ✅ Usuario introduce su correo electrónico
3. ✅ Sistema envía email con enlace de recuperación usando `resetPasswordForEmail()`
4. ✅ Usuario hace clic en el enlace del email
5. ✅ Supabase verifica el token y redirige a `https://mat89.vercel.app/#access_token=...&type=recovery`
6. ✅ **NUEVO:** `PasswordRecoveryHandler` detecta el token en el hash y redirige a `/reset-password`
7. ✅ `ResetPasswordPage` valida el token y muestra el formulario de nueva contraseña
8. ✅ Usuario establece nueva contraseña
9. ✅ **NUEVO:** Sistema cierra la sesión automáticamente
10. ✅ Usuario es redirigido al login para autenticarse con la nueva contraseña

## Verificación del Funcionamiento

### Prueba en Local:
```bash
npm run dev
```

1. Ir a http://localhost:5173/login
2. Hacer clic en "¿Olvidaste tu contraseña?"
3. Introducir un email válido
4. Revisar el email recibido y hacer clic en el enlace
5. **Debe aparecer automáticamente la página de "Establece tu nueva contraseña"**

### Prueba en Producción:
1. Ir a https://mat89.vercel.app/login
2. Seguir los mismos pasos anteriores

## Notas Técnicas

- El componente `PasswordRecoveryHandler` se renderiza dentro del `<BrowserRouter>` para tener acceso a `useNavigate()`
- Se mantiene el estado `isRecoveryMode` para desactivar el timer de inactividad durante el reset
- El token de acceso se pasa automáticamente por Supabase en el hash de la URL
- `ResetPasswordPage` valida el token usando `supabase.auth.getUser()`
- **Seguridad:** Después de actualizar la contraseña, el sistema cierra la sesión automáticamente usando `signOut()` para forzar al usuario a autenticarse con la nueva contraseña
- El tiempo de espera antes del cierre de sesión es de 2 segundos, permitiendo que el usuario vea el mensaje de éxito

## Troubleshooting

### El enlace sigue sin funcionar
1. Verificar que las URLs están configuradas correctamente en Supabase
2. Revisar la consola del navegador en busca de errores
3. Verificar que el email de recuperación no ha expirado (válido por 24 horas)

### Error "Token has expired or is invalid"
- El token de recuperación expira en 24 horas
- Solicitar un nuevo enlace de recuperación

### La página se queda en blanco
- Verificar que `PasswordRecoveryHandler` está dentro de `<BrowserRouter>`
- Revisar la consola del navegador para errores de JavaScript

## Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/auth-password-reset)
- [React Router - useNavigate](https://reactrouter.com/en/main/hooks/use-navigate)
- Código relevante:
  - [App.tsx:72-94](src/App.tsx#L72-L94) - PasswordRecoveryHandler
  - [LoginPage.tsx:154-156](src/pages/LoginPage.tsx#L154-L156) - resetPasswordForEmail
  - [ResetPasswordPage.tsx:32-53](src/pages/ResetPasswordPage.tsx#L32-L53) - Validación de token

---

**Última actualización:** 2025-11-29
**Estado:** Código implementado ✅ | Configuración Supabase pendiente ⚠️
