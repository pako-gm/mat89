import { useState } from "react";
import SupplierList from "@/components/suppliers/SupplierList";
import SupplierDetails from "@/components/suppliers/SupplierDetails";
import SupplierForm from "@/components/suppliers/SupplierForm";
import { Supplier } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProveedoresPage() {
  const { toast } = useToast();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        />
      )}

      <SupplierForm
        open={showForm}
        supplier={isEditing ? selectedSupplier : null}
        onClose={() => setShowForm(false)}
        onSave={handleSupplierSaved}
        isEditing={isEditing}
      />
    </div>
  );
}