import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Wrench,
  Power,
  PowerOff,
  Database,
  Users,
  Package,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Activity
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Constantes de colores
const COLOR_PRIMARIO = '#91268F';

interface MaintenanceMode {
  id: number;
  is_active: boolean;
  message: string | null;
  activated_by: string | null;
  activated_at: string | null;
  last_updated: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalPedidos: number;
  totalMateriales: number;
  totalProveedores: number;
}

export default function PaginaPruebas() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalPedidos: 0,
    totalMateriales: 0,
    totalProveedores: 0,
  });
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser({ email: user.email || '' });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar estado del modo mantenimiento
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('tbl_maintenance_mode')
        .select('*')
        .eq('id', 1)
        .single();

      if (maintenanceError) throw maintenanceError;
      setMaintenanceMode(maintenanceData);
      setCustomMessage(maintenanceData.message || '');

      // Cargar estadísticas del sistema
      await loadSystemStats();
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del sistema',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      // Total de usuarios
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Usuarios activos
      const { count: activeUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', true);

      // Total de pedidos
      const { count: totalPedidos } = await supabase
        .from('tbl_pedidos_rep')
        .select('*', { count: 'exact', head: true });

      // Total de materiales
      const { count: totalMateriales } = await supabase
        .from('tbl_materiales')
        .select('*', { count: 'exact', head: true });

      // Total de proveedores
      const { count: totalProveedores } = await supabase
        .from('tbl_proveedores')
        .select('*', { count: 'exact', head: true });

      setSystemStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalPedidos: totalPedidos || 0,
        totalMateriales: totalMateriales || 0,
        totalProveedores: totalProveedores || 0,
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const toggleMaintenanceMode = async (activate: boolean) => {
    try {
      const updateData = {
        is_active: activate,
        message: customMessage || 'El sistema está en modo mantenimiento. Por favor, intenta más tarde.',
        activated_by: activate ? currentUser?.email : null,
        activated_at: activate ? new Date().toISOString() : null,
        last_updated: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tbl_maintenance_mode')
        .update(updateData)
        .eq('id', 1);

      if (error) throw error;

      toast({
        title: activate ? 'Modo Mantenimiento Activado' : 'Modo Mantenimiento Desactivado',
        description: activate
          ? 'El sistema está ahora en modo mantenimiento. Los usuarios no administradores no podrán acceder.'
          : 'El sistema ha vuelto a modo producción normal.',
        variant: activate ? 'default' : 'default',
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cambiar el modo mantenimiento',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: COLOR_PRIMARIO }}
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-center gap-4">
          <Wrench className="w-10 h-10" style={{ color: COLOR_PRIMARIO }} />
          <div className="text-center">
            <h1 className="text-5xl font-bold text-slate-700">
              Página de Mantenimiento del Sistema
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Pagina para activar modo de Mantenimiento del Sistema
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Card: Modo Mantenimiento */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${COLOR_PRIMARIO}20` }}
            >
              {maintenanceMode?.is_active ? (
                <PowerOff className="w-6 h-6" style={{ color: COLOR_PRIMARIO }} />
              ) : (
                <Power className="w-6 h-6" style={{ color: COLOR_PRIMARIO }} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Modo Mantenimiento</h2>
              <p className="text-sm text-gray-600">
                Control del estado del sistema
              </p>
            </div>
          </div>

          {/* Estado Actual */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Estado Actual:</span>
              {maintenanceMode?.is_active ? (
                <span className="flex items-center gap-2 text-red-600 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  MANTENIMIENTO
                </span>
              ) : (
                <span className="flex items-center gap-2 text-green-600 font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  PRODUCCIÓN
                </span>
              )}
            </div>

            {maintenanceMode?.is_active && maintenanceMode.activated_by && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong>Activado por:</strong> {maintenanceMode.activated_by}
                </p>
                <p className="text-xs text-gray-600">
                  <strong>Fecha:</strong>{' '}
                  {maintenanceMode.activated_at
                    ? new Date(maintenanceMode.activated_at).toLocaleString('es-ES')
                    : '-'}
                </p>
              </div>
            )}
          </div>

          {/* Mensaje Personalizado */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje para usuarios:
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
              rows={3}
              placeholder="El sistema está en modo mantenimiento..."
            />
          </div>

          {/* Botones de Control */}
          <div className="flex gap-3">
            <Button
              onClick={() => toggleMaintenanceMode(true)}
              disabled={maintenanceMode?.is_active}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PowerOff className="w-4 h-4 mr-2" />
              Activar Mantenimiento
            </Button>
            <Button
              onClick={() => toggleMaintenanceMode(false)}
              disabled={!maintenanceMode?.is_active}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Power className="w-4 h-4 mr-2" />
              Volver a Producción
            </Button>
          </div>
        </Card>

        {/* Card: Información del Sistema */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${COLOR_PRIMARIO}20` }}
            >
              <Activity className="w-6 h-6" style={{ color: COLOR_PRIMARIO }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Estado del Sistema</h2>
              <p className="text-sm text-gray-600">
                Información y estadísticas en tiempo real
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Fecha y Hora */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Fecha/Hora:</span>
              </div>
              <span className="text-sm text-gray-900">
                {new Date().toLocaleString('es-ES')}
              </span>
            </div>

            {/* Última Actualización */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Última Act.:</span>
              </div>
              <span className="text-sm text-gray-900">
                {maintenanceMode?.last_updated
                  ? new Date(maintenanceMode.last_updated).toLocaleString('es-ES')
                  : '-'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={loadData}
              variant="outline"
              className="w-full"
              style={{ borderColor: COLOR_PRIMARIO, color: COLOR_PRIMARIO }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recargar Datos
            </Button>
          </div>
        </Card>
      </div>

      {/* Estadísticas del Sistema */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6" style={{ color: COLOR_PRIMARIO }} />
          <h2 className="text-2xl font-bold text-gray-800">Estadísticas del Sistema</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Usuarios */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Usuarios</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">{systemStats.totalUsers}</p>
          </div>

          {/* Usuarios Activos */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Usuarios Activos</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{systemStats.activeUsers}</p>
          </div>

          {/* Total Pedidos */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Total Pedidos</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{systemStats.totalPedidos}</p>
          </div>

          {/* Total Materiales */}
          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Total Materiales</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{systemStats.totalMateriales}</p>
          </div>

          {/* Total Proveedores */}
          <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-pink-600" />
              <span className="text-sm font-medium text-pink-900">Total Proveedores</span>
            </div>
            <p className="text-3xl font-bold text-pink-600">{systemStats.totalProveedores}</p>
          </div>
        </div>
      </div>

      {/* Información de Uso */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Instrucciones de Uso
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>1. Activar Modo Mantenimiento:</strong> Haz clic en "Activar Mantenimiento" para paralizar el sistema. Los usuarios normales no podrán acceder.
          </p>
          <p>
            <strong>2. Personalizar Mensaje:</strong> Edita el mensaje que verán los usuarios mientras el sistema está en mantenimiento.
          </p>
          <p>
            <strong>3. Volver a Producción:</strong> Cuando termines las modificaciones, haz clic en "Volver a Producción" para restaurar el servicio.
          </p>
          <p className="pt-2 border-t border-blue-300 mt-3">
            <strong>Nota:</strong> Solo los usuarios con rol ADMINISTRADOR pueden acceder a esta página y controlar el modo mantenimiento.
          </p>
        </div>
      </div>
    </div>
  );
}
