import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLOR_PRIMARIO = '#91268F';

interface MaintenanceInfo {
  message: string | null;
  activated_at: string | null;
}

export default function MaintenancePage() {
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo>({
    message: null,
    activated_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadMaintenanceInfo();

    // Recargar cada 30 segundos para verificar si volvió a producción
    const interval = setInterval(() => {
      checkIfMaintenanceEnded();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadMaintenanceInfo = async () => {
    try {
      const { data } = await supabase
        .from('tbl_maintenance_mode')
        .select('message, activated_at')
        .eq('id', 1)
        .single();

      if (data) {
        setMaintenanceInfo(data);
      }
    } catch (error) {
      console.error('Error loading maintenance info:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfMaintenanceEnded = async () => {
    try {
      const { data } = await supabase
        .from('tbl_maintenance_mode')
        .select('is_active')
        .eq('id', 1)
        .single();

      // Si el modo mantenimiento se desactivó, cerrar sesión y redirigir al login
      if (data && !data.is_active) {
        await signOut();
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
    }
  };

  const handleRefresh = async () => {
    setChecking(true);

    // Verificar si el modo mantenimiento se desactivó
    await checkIfMaintenanceEnded();

    // Si llegamos aquí, el modo mantenimiento sigue activo
    // Esperar un poco para dar feedback visual
    setTimeout(() => {
      setChecking(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: COLOR_PRIMARIO }}
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-2xl w-full">
        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Icono de advertencia */}
          <div className="flex justify-center mb-4">
            <div
              className="p-6 rounded-full animate-pulse"
              style={{ backgroundColor: `${COLOR_PRIMARIO}20` }}
            >
              <AlertTriangle
                className="w-16 h-16"
                style={{ color: COLOR_PRIMARIO }}
              />
            </div>
          </div>

          {/* Logo/Nombre del sistema */}
          <div className="text-center mb-6">
            <p className="text-3xl font-medium mb-2">
              <span className="text-gray-600">Mat</span>
              <span style={{ color: COLOR_PRIMARIO }}>89</span>
            </p>
            <p className="text-sm text-gray-500">
              Sistema de Gestión de Reparaciones
            </p>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
            Sistema en Mantenimiento
          </h1>

          {/* Mensaje personalizado */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <p className="text-lg text-gray-700 text-center leading-relaxed">
              {maintenanceInfo.message ||
                'El sistema está en modo mantenimiento. Por favor, intenta más tarde.'}
            </p>
          </div>

          {/* Mensaje de disculpa */}
          <p className="text-center text-gray-600 mb-4">
            Lamentamos las molestias. Estamos trabajando para mejorar tu experiencia.
          </p>

          {/* Nota importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-center text-blue-800">
              Debes volver a <strong>iniciar sesión</strong> para acceder al sistema
            </p>
          </div>

          {/* Botón de verificación */}
          <div className="flex justify-center">
            <Button
              onClick={handleRefresh}
              disabled={checking}
              className="text-white px-8 py-3 rounded-full hover:opacity-90 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: COLOR_PRIMARIO }}
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Verificando...' : 'Verificar y Cerrar Sesión'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
