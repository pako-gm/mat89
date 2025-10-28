import { useEffect, useRef, useCallback, useState } from 'react';

interface UseIdleTimeoutOptions {
  /**
   * Tiempo de inactividad en milisegundos antes de ejecutar el callback
   * Por defecto: 15 minutos (900000 ms)
   */
  timeout?: number;

  /**
   * Tiempo en milisegondos antes del timeout para mostrar advertencia
   * Por defecto: 2 minutos antes (120000 ms)
   */
  warningTime?: number;

  /**
   * Callback que se ejecuta cuando se alcanza el timeout
   */
  onTimeout: () => void;

  /**
   * Eventos del DOM que resetean el timer de inactividad
   */
  events?: string[];

  /**
   * Si está habilitado el monitoreo (por defecto: true)
   */
  enabled?: boolean;
}

/**
 * Hook personalizado que detecta inactividad del usuario y ejecuta una acción
 * tras un período de tiempo especificado.
 *
 * @example
 * ```tsx
 * const { showWarning, resetTimer } = useIdleTimeout({
 *   timeout: 900000, // 15 minutos
 *   warningTime: 120000, // 2 minutos antes
 *   onTimeout: handleLogout,
 * });
 * ```
 */
export function useIdleTimeout({
  timeout = 15 * 60 * 1000, // 15 minutos por defecto
  warningTime = 2 * 60 * 1000, // 2 minutos antes por defecto
  onTimeout,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  enabled = true,
}: UseIdleTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const timeoutIdRef = useRef<NodeJS.Timeout>();
  const warningTimeoutIdRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());
  const isWarningShownRef = useRef<boolean>(false);

  /**
   * Limpia todos los timers activos
   */
  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (warningTimeoutIdRef.current) {
      clearTimeout(warningTimeoutIdRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  }, []);

  /**
   * Inicia la cuenta regresiva visible en el modal de advertencia
   */
  const startCountdown = useCallback(() => {
    const updateRemainingTime = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeout - elapsed);
      setRemainingTime(Math.ceil(remaining / 1000)); // Convertir a segundos

      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }
    };

    // Actualizar inmediatamente
    updateRemainingTime();

    // Actualizar cada segundo
    countdownIntervalRef.current = setInterval(updateRemainingTime, 1000);
  }, [timeout]);

  /**
   * Resetea el timer de inactividad
   */
  const resetTimer = useCallback((forceReset: boolean = false) => {
    // Si ya está mostrando warning y NO es un reset forzado, no hacer nada
    if (isWarningShownRef.current && !forceReset) {
      return;
    }

    clearTimers();

    // Solo resetear el warning si es un reset forzado (click en botón)
    if (forceReset) {
      setShowWarning(false);
      isWarningShownRef.current = false;
    }

    lastActivityRef.current = Date.now();

    if (!enabled) {
      return;
    }

    // Configurar advertencia
    const warningDelay = timeout - warningTime;
    warningTimeoutIdRef.current = setTimeout(() => {
      setShowWarning(true);
      isWarningShownRef.current = true;
      startCountdown();
    }, warningDelay);

    // Configurar timeout de logout
    timeoutIdRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  }, [enabled, timeout, warningTime, onTimeout, clearTimers, startCountdown]);

  /**
   * Manejador de eventos con throttling para optimizar rendimiento
   * Usa ref para evitar problemas con closures
   */
  const handleActivity = useCallback(() => {
    // No resetear el timer si ya se está mostrando la advertencia
    if (isWarningShownRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // Throttle: solo resetear si ha pasado al menos 1 segundo desde la última actividad
    if (timeSinceLastActivity > 1000) {
      resetTimer(false); // No forzar reset del warning
    }
  }, [resetTimer]);

  /**
   * Configurar y limpiar event listeners - solo se ejecuta cuando enabled o events cambian
   */
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setShowWarning(false);
      isWarningShownRef.current = false;
      return;
    }

    // Inicializar timer (no forzar reset si ya hay warning mostrado)
    resetTimer(false);

    // Agregar event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Limpieza
    return () => {
      // Solo limpiar timers si NO está mostrando warning
      // Si está mostrando warning, queremos que el countdown continúe
      if (!isWarningShownRef.current) {
        clearTimers();
      }

      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, events, handleActivity, resetTimer, clearTimers]);

  /**
   * Función wrapper para resetear con fuerza (usada por el botón "Continuar sesión")
   */
  const forceResetTimer = useCallback(() => {
    resetTimer(true);
  }, [resetTimer]);

  return {
    /**
     * Indica si se debe mostrar la advertencia de inactividad
     */
    showWarning,

    /**
     * Tiempo restante en segundos antes del logout automático
     */
    remainingTime,

    /**
     * Función para resetear manualmente el timer (útil para el botón "Continuar sesión")
     */
    resetTimer: forceResetTimer,
  };
}
