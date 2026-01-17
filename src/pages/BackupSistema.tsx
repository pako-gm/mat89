import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  AlertCircle,
  ArrowLeft,
  HardDrive,
  Calendar,
  FileText
} from 'lucide-react';
import {
  generateFullBackup,
  downloadSQLFile,
  saveBackupMetadata,
  listBackups,
  deleteBackupMetadata,
  validateAdminPermission,
  type BackupMetadata,
  type BackupProgress
} from '../lib/backup';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

export default function BackupSistema() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Verificar permisos de administrador
  useEffect(() => {
    checkAdminPermission();
  }, []);

  // Cargar lista de backups
  useEffect(() => {
    if (isAdmin) {
      loadBackups();
    }
  }, [isAdmin]);

  async function checkAdminPermission() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "No autorizado",
          description: "Debes iniciar sesión para acceder a esta sección",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      setCurrentUser(user);
      const hasPermission = await validateAdminPermission(user.id);

      if (!hasPermission) {
        toast({
          title: "Acceso denegado",
          description: "Solo los administradores pueden gestionar backups del sistema",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error verificando permisos:', error);
      navigate('/');
    }
  }

  async function loadBackups() {
    try {
      setLoading(true);
      const data = await listBackups();
      setBackups(data);
    } catch (error) {
      console.error('Error cargando backups:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los backups registrados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBackup() {
    if (!currentUser) return;

    try {
      setIsGenerating(true);
      setProgress({ table: 'Iniciando...', current: 0, total: 8, percentage: 0 });

      // Obtener perfil del usuario para nombre
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('nombre_usuario')
        .eq('user_id', currentUser.id)
        .single();

      const userName = profile?.nombre_usuario || currentUser.email || 'Unknown';

      // Generar backup
      const { sql, metadata } = await generateFullBackup(userName, setProgress);

      // Guardar metadata en la base de datos
      await saveBackupMetadata(metadata);

      // Descargar archivo SQL
      downloadSQLFile(sql, metadata.nombre_archivo);

      // Actualizar lista
      await loadBackups();

      toast({
        title: "Backup generado exitosamente",
        description: `${metadata.registros_totales} registros respaldados en ${metadata.nombre_archivo}`,
      });

    } catch (error) {
      console.error('Error generando backup:', error);
      toast({
        title: "Error al generar backup",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }

  async function handleDeleteBackup(id: string, filename: string) {
    if (!confirm(`¿Estás seguro de eliminar el registro del backup "${filename}"?\n\nNOTA: Esto solo elimina el registro, no el archivo físico.`)) {
      return;
    }

    try {
      await deleteBackupMetadata(id);
      await loadBackups();

      toast({
        title: "Registro eliminado",
        description: `El registro del backup "${filename}" ha sido eliminado`,
      });
    } catch (error) {
      console.error('Error eliminando backup:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro del backup",
        variant: "destructive"
      });
    }
  }

  function handleRestoreBackup() {
    toast({
      title: "Restauración de backups",
      description: (
        <div className="space-y-2 text-sm">
          <p>Para restaurar un backup, sigue estos pasos:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Descarga el archivo SQL del backup</li>
            <li>Accede al panel de Supabase</li>
            <li>Ve a SQL Editor</li>
            <li>Ejecuta el contenido del archivo SQL</li>
          </ol>
          <p className="mt-2 text-amber-600 font-semibold">
            ⚠️ ADVERTENCIA: La restauración sobrescribirá los datos actuales
          </p>
        </div>
      ),
    });
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatFileSize(kb: number): string {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/panel-control')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al Panel de Control
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-700">
            Backup del Sistema
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Gestión de backups y restauración de la base de datos
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mb-6">
        <button
          onClick={loadBackups}
          disabled={loading || isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>

        <button
          onClick={handleGenerateBackup}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          <Download className="w-4 h-4" />
          {isGenerating ? 'Generando...' : 'Generar Backup'}
        </button>
      </div>

        {/* Progress Bar */}
        {isGenerating && progress && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <h3 className="font-semibold text-gray-900">Generando backup...</h3>
                <p className="text-sm text-gray-600">
                  Procesando tabla: {progress.table} ({progress.current}/{progress.total})
                </p>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <p className="text-right text-sm text-gray-600 mt-2">
              {progress.percentage}% completado
            </p>
          </div>
        )}

        {/* Alert Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Información importante sobre backups:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Los backups incluyen todas las tablas y datos del sistema</li>
                <li>Se recomienda realizar backups antes de cambios importantes</li>
                <li>Los archivos SQL se descargan automáticamente en tu navegador</li>
                <li>Para restaurar, usa el SQL Editor de Supabase o herramientas CLI</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Backups List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Historial de Backups ({backups.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Cargando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No hay backups registrados</p>
              <p className="text-sm text-gray-500">
                Genera tu primer backup usando el botón de arriba
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Archivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tamaño
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registros
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {backup.nombre_archivo}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDate(backup.fecha_creacion)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatFileSize(backup.tamano_kb)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {backup.registros_totales ? backup.registros_totales.toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {backup.usuario_creador}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          backup.tipo === 'manual'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {backup.tipo === 'manual' ? 'Manual' : 'Automático'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteBackup(backup.id!, backup.nombre_archivo)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Restore Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start gap-4">
            <Upload className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Restaurar Backup
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Para restaurar un backup, necesitarás acceso al panel de administración de Supabase.
                La restauración sobrescribirá todos los datos actuales.
              </p>
              <button
                onClick={handleRestoreBackup}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Ver instrucciones de restauración
              </button>
            </div>
          </div>
        </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Los archivos de backup se descargan en formato SQL y pueden ser ejecutados en Supabase SQL Editor
        </p>
      </div>
    </div>
  );
}
