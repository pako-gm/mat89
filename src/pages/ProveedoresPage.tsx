import { useState } from "react";
import SupplierList from "@/components/suppliers/SupplierList";
import SupplierDetails from "@/components/suppliers/SupplierDetails";
import SupplierForm from "@/components/suppliers/SupplierForm";
import { Supplier } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteSupplier } from "@/lib/data";
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

export default function ProveedoresPage() {
  const { toast } = useToast();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsEditing(true);
    setShowDetails(false);
    setShowForm(true);
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetails(true);
  };

  const handleDeleteSupplier = () => {
    if (selectedSupplier) {
      setSupplierToDelete(selectedSupplier);
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    
    try {
      await deleteSupplier(supplierToDelete.id);
      
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor ha sido eliminado correctamente",
      });
      
      // Close details dialog and refresh list
      setShowDetails(false);
      setSelectedSupplier(null);
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el proveedor. Por favor, inténtelo de nuevo.",
      });
    }
    
    setSupplierToDelete(null);
  };

  const handleSupplierSaved = () => {
    toast({
      title: isEditing ? "Proveedor actualizado" : "Proveedor creado",
      description: isEditing 
        ? "El proveedor ha sido actualizado correctamente"
        : "El proveedor ha sido creado correctamente",
    });
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedSupplier(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Gestión de Proveedores</h1>
        <Button 
          onClick={handleAddSupplier}
          className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
        </Button>
      </div>

      <SupplierList 
        onViewDetails={handleViewDetails}
        refreshTrigger={refreshTrigger}
      />

      {showDetails && selectedSupplier && (
        <SupplierDetails
          supplier={selectedSupplier}
          open={showDetails}
          onClose={handleCloseDetails}
          onEdit={() => handleEditSupplier(selectedSupplier)}
          onDelete={handleDeleteSupplier}
        />
      )}

      <SupplierForm
        open={showForm}
        supplier={isEditing ? selectedSupplier : null}
        onClose={() => setShowForm(false)}
        onSave={handleSupplierSaved}
        isEditing={isEditing}
      />

      <AlertDialog open={!!supplierToDelete} onOpenChange={() => setSupplierToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              ¿Está seguro que desea eliminar este proveedor?
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