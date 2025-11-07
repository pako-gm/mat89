import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AppVersion } from '@/types';
import { getAllVersions, saveVersion, deleteVersion } from '@/lib/data';
import { Plus, Edit, Trash2, Calendar, Package, Save, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function VersionesPage() {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVersion, setEditingVersion] = useState<Partial<AppVersion> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await getAllVersions();
      setVersions(data);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las versiones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewVersion = () => {
    setEditingVersion({
      versionNumber: '',
      versionName: '',
      releaseDate: new Date().toISOString().split('T')[0],
      changes: [''],
    });
  };

  const handleEdit = (version: AppVersion) => {
    setEditingVersion({
      ...version,
      releaseDate: version.releaseDate.split('T')[0],
    });
  };

  const handleSave = async () => {
    if (!editingVersion) return;

    if (
      !editingVersion.versionNumber ||
      !editingVersion.versionName ||
      !editingVersion.releaseDate ||
      !editingVersion.changes ||
      editingVersion.changes.length === 0 ||
      editingVersion.changes.some((c) => !c.trim())
    ) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos y añade al menos un cambio',
        variant: 'destructive',
      });
      return;
    }

    const result = await saveVersion({
      ...editingVersion,
      changes: editingVersion.changes.filter((c) => c.trim() !== ''),
    });

    if (result.success) {
      toast({
        title: 'Éxito',
        description: editingVersion.id
          ? 'Versión actualizada correctamente'
          : 'Versión creada correctamente',
      });
      setEditingVersion(null);
      loadVersions();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'No se pudo guardar la versión',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!versionToDelete) return;

    const result = await deleteVersion(versionToDelete);

    if (result.success) {
      toast({
        title: 'Éxito',
        description: 'Versión eliminada correctamente',
      });
      loadVersions();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'No se pudo eliminar la versión',
        variant: 'destructive',
      });
    }

    setDeleteDialogOpen(false);
    setVersionToDelete(null);
  };

  const handleAddChange = () => {
    if (!editingVersion) return;
    setEditingVersion({
      ...editingVersion,
      changes: [...(editingVersion.changes || []), ''],
    });
  };

  const handleChangeUpdate = (index: number, value: string) => {
    if (!editingVersion) return;
    const newChanges = [...(editingVersion.changes || [])];
    newChanges[index] = value;
    setEditingVersion({
      ...editingVersion,
      changes: newChanges,
    });
  };

  const handleRemoveChange = (index: number) => {
    if (!editingVersion) return;
    const newChanges = [...(editingVersion.changes || [])];
    newChanges.splice(index, 1);
    setEditingVersion({
      ...editingVersion,
      changes: newChanges,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#91268F]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Versiones APP</h1>
        {!editingVersion && (
          <Button onClick={handleNewVersion} className="bg-[#91268F] hover:bg-[#7a1f79]">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Versión
          </Button>
        )}
      </div>

      {editingVersion && (
        <Card className="p-6 border-2 border-[#91268F]">
          <h2 className="text-xl font-bold mb-4">
            {editingVersion.id ? 'Editar Versión' : 'Nueva Versión'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="versionNumber">Número de Versión</Label>
              <Input
                id="versionNumber"
                placeholder="ej: 2.1.0"
                value={editingVersion.versionNumber || ''}
                onChange={(e) =>
                  setEditingVersion({ ...editingVersion, versionNumber: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="versionName">Nombre de la Versión</Label>
              <Input
                id="versionName"
                placeholder="ej: Mejoras de Seguridad"
                value={editingVersion.versionName || ''}
                onChange={(e) =>
                  setEditingVersion({ ...editingVersion, versionName: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="releaseDate">Fecha de Lanzamiento</Label>
              <Input
                id="releaseDate"
                type="date"
                value={editingVersion.releaseDate || ''}
                onChange={(e) =>
                  setEditingVersion({ ...editingVersion, releaseDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Label>Cambios Principales</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddChange}
                className="text-[#91268F] border-[#91268F]"
              >
                <Plus className="h-3 w-3 mr-1" />
                Añadir Cambio
              </Button>
            </div>

            <div className="space-y-2">
              {editingVersion.changes?.map((change, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Cambio ${index + 1}`}
                    value={change}
                    onChange={(e) => handleChangeUpdate(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveChange(index)}
                    className="text-red-500 border-red-500 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingVersion(null)}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-[#91268F] hover:bg-[#7a1f79]">
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {versions.map((version, index) => (
          <Card
            key={version.id}
            className={`p-5 ${
              index === 0
                ? 'border-2 border-[#91268F] bg-gradient-to-br from-purple-50 to-white'
                : 'border border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`p-2 rounded-lg ${
                    index === 0 ? 'bg-[#91268F] text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-gray-900">{version.versionName}</h3>
                    {index === 0 && (
                      <span className="text-xs bg-[#91268F] text-white px-2 py-1 rounded-full">
                        ACTUAL
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Versión {version.versionNumber}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(version.releaseDate)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(version)}
                  className="text-[#91268F] border-[#91268F]"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVersionToDelete(version.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-red-500 border-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Cambios principales:</h4>
              <ul className="space-y-1">
                {version.changes.map((change, changeIndex) => (
                  <li key={changeIndex} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-[#91268F] mt-0.5">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta versión del
              historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
