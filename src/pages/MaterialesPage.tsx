import { useState } from "react";
import MaterialList from "@/components/materials/MaterialList";
import MaterialDetails from "@/components/materials/MaterialDetails";
import MaterialForm from "@/components/materials/MaterialForm";
import { Material } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteMaterial } from "@/lib/data";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MaterialesPage() {
  const { toast } = useToast();
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const handleAddMaterial = () => {
    setSelectedMaterial(null);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setIsEditing(true);
    setShowDetails(false);
    setShowForm(true);
  };

  const handleViewDetails = (material: Material) => {
    setSelectedMaterial(material);
    setShowDetails(true);
  };

  const handleDeleteMaterial = () => {
    if (selectedMaterial) {
      setMaterialToDelete(selectedMaterial);
    }
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    
    try {
      await deleteMaterial(materialToDelete.id);
      
      toast({
        title: "Material eliminado",
        description: "El material ha sido eliminado correctamente",
      });
      
      // Close details dialog and refresh list
      setShowDetails(false);
      setSelectedMaterial(null);
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error("Error deleting material:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el material. Por favor, inténtelo de nuevo.",
      });
    }
    
    setMaterialToDelete(null);
  };

  const handleMaterialSaved = () => {
    toast({
      title: isEditing ? "Material actualizado" : "Material creado",
      description: isEditing 
        ? "El material ha sido actualizado correctamente"
        : "El material ha sido creado correctamente",
    });
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedMaterial(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Gestión de Materiales</h1>
        <Button 
          onClick={handleAddMaterial}
          className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Material
        </Button>
      </div>

      <MaterialList 
        onViewDetails={handleViewDetails}
        refreshTrigger={refreshTrigger}
      />

      {showDetails && selectedMaterial && (
        <MaterialDetails
          material={selectedMaterial}
          open={showDetails}
          onClose={handleCloseDetails}
          onEdit={() => handleEditMaterial(selectedMaterial)}
          onDelete={handleDeleteMaterial}
        />
      )}

      <MaterialForm
        open={showForm}
        material={isEditing ? selectedMaterial : null}
        onClose={() => setShowForm(false)}
        onSave={handleMaterialSaved}
        isEditing={isEditing}
      />

      <AlertDialog open={!!materialToDelete} onOpenChange={() => setMaterialToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              ¿Está seguro que desea eliminar este material?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-200 text-gray-800 hover:bg-gray-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}