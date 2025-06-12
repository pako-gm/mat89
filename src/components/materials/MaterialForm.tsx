import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Material } from "@/types";
import { saveMaterial, getAllSuppliers, checkMaterialRegistrationExists } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { hasAnyRole } from "@/lib/auth";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MaterialFormProps {
  open: boolean;
  material: Material | null;
  onClose: () => void;
  onSave: () => void;
  isEditing: boolean;
}

export default function MaterialForm({ 
  open, 
  material, 
  onClose, 
  onSave, 
  isEditing 
}: MaterialFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [suppliers, setSuppliers] = useState<{id: string; name: string}[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<{
    isValid: boolean;
    isDuplicate: boolean;
    isChecking: boolean;
    message: string;
  }>({
    isValid: true,
    isDuplicate: false,
    isChecking: false,
    message: ""
  });
  
  const [formData, setFormData] = useState<Material>({
    id: "",
    registration: 0,
    description: "",
    vehicleSeries: "",
    supplierId: "",
    supplierName: ""
  });

  // Load suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const data = await getAllSuppliers();
        const supplierOptions = data.map(supplier => ({
          id: supplier.id,
          name: supplier.name
        }));
        setSuppliers(supplierOptions);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      }
    };
    
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  useEffect(() => {
    if (material) {
      setFormData({
        id: material.id,
        registration: material.registration || 0,
        description: material.description || "",
        vehicleSeries: material.vehicleSeries || "",
        supplierId: material.supplierId || "",
        supplierName: material.supplierName || ""
      });
    } else {
      setFormData({
        id: uuidv4(),
        registration: 0,
        description: "",
        vehicleSeries: "",
        supplierId: "",
        supplierName: ""
      });
    }
    setFormErrors({});
    setRegistrationStatus({
      isValid: true,
      isDuplicate: false,
      isChecking: false,
      message: ""
    });
    setAuthError(null);
  }, [material, open]);

  // Check for duplicate registration numbers
  useEffect(() => {
    const checkRegistration = async () => {
      if (!formData.registration || formData.registration <= 0) {
        setRegistrationStatus({
          isValid: true,
          isDuplicate: false,
          isChecking: false,
          message: ""
        });
        return;
      }

      setRegistrationStatus(prev => ({ ...prev, isChecking: true }));

      try {
        const isDuplicate = await checkMaterialRegistrationExists(
          formData.registration, 
          isEditing ? formData.id : undefined
        );
        
        if (isDuplicate) {
          setRegistrationStatus({
            isValid: false,
            isDuplicate: true,
            isChecking: false,
            message: "Esta matrícula ya existe en la base de datos."
          });
        } else {
          setRegistrationStatus({
            isValid: true,
            isDuplicate: false,
            isChecking: false,
            message: "Matrícula disponible."
          });
        }
      } catch (error) {
        console.error("Error checking registration:", error);
        setRegistrationStatus({
          isValid: true,
          isDuplicate: false,
          isChecking: false,
          message: ""
        });
      }
    };

    const timeoutId = setTimeout(checkRegistration, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.registration, formData.id, isEditing]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.registration || formData.registration <= 0) {
      errors.registration = "La matrícula es obligatoria y debe ser mayor a 0";
    } else if (registrationStatus.isDuplicate) {
      errors.registration = "Esta matrícula ya existe";
    }
    
    if (!formData.description.trim()) {
      errors.description = "La descripción es obligatoria";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "registration") {
      // Only allow positive integers
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase()
      }));
    }
    
    // Clear error when field is being edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "supplier") {
      const selectedSupplier = suppliers.find(s => s.id === value);
      setFormData(prev => ({
        ...prev,
        supplierId: value,
        supplierName: selectedSupplier?.name || ""
      }));
    }
  };

  const checkUserAuthentication = async () => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Authentication error:", error);
        setAuthError("Error de autenticación: " + error.message);
        return false;
      }
      
      if (!data.user || !data.user.id) {
        setAuthError("No se ha podido verificar su sesión. Por favor, inicie sesión nuevamente.");
        return false;
      }
      
      const hasPermission = await hasAnyRole(['ADMINISTRADOR', 'EDICION']);
      
      if (!hasPermission) {
        setAuthError("No tiene permisos suficientes para realizar esta acción.");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking authentication:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setAuthError("Error al verificar la autenticación: " + errorMessage);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "Por favor, corrija los campos marcados en rojo.",
      });
      return;
    }

    if (registrationStatus.isChecking) {
      toast({
        variant: "destructive",
        title: "Verificación en curso",
        description: "Por favor, espere a que se verifique la matrícula.",
      });
      return;
    }

    const isAuthenticated = await checkUserAuthentication();
    if (!isAuthenticated) {
      return;
    }
    
    setLoading(true);
    
    try {
      await saveMaterial(formData);
      onSave();
    } catch (error) {
      console.error("Error saving material:", error);
      let errorMessage = "No se pudo guardar el material. Por favor, inténtelo de nuevo.";
      
      if (error instanceof Error) {
        if (error.message.includes("duplicate key")) {
          errorMessage = "Ya existe un material con esta matrícula.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Material" : "Nuevo Material"}
          </DialogTitle>
        </DialogHeader>
        
        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{authError}</p>
            <p className="text-sm mt-1">Para continuar, por favor intente:</p>
            <ul className="list-disc text-sm ml-5">
              <li>Cerrar sesión y volver a iniciar sesión</li>
              <li>Verificar que su cuenta tenga los permisos necesarios</li>
              <li>Contactar al administrador del sistema</li>
            </ul>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration" className="text-sm font-medium">
                Matrícula 89 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="registration"
                name="registration"
                type="number"
                min="1"
                value={formData.registration || ""}
                onChange={handleChange}
                className={`h-9 ${
                  formErrors.registration || registrationStatus.isDuplicate 
                    ? 'border-red-500 focus:border-red-500' 
                    : registrationStatus.isValid && formData.registration > 0 && registrationStatus.message
                    ? 'border-green-500 focus:border-green-500'
                    : ''
                }`}
                placeholder="89654014"
              />
              {formErrors.registration && (
                <p className="text-xs text-red-500 mt-1">{formErrors.registration}</p>
              )}
              
              {/* Registration status indicator */}
              {formData.registration > 0 && registrationStatus.message && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${
                  registrationStatus.isDuplicate ? 'text-red-500' : 'text-green-600'
                }`}>
                  {registrationStatus.isChecking ? (
                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                  ) : registrationStatus.isDuplicate ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  <span>{registrationStatus.message}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vehicleSeries" className="text-sm font-medium">
                Serie Vehículo
              </Label>
              <Input
                id="vehicleSeries"
                name="vehicleSeries"
                value={formData.vehicleSeries || ""}
                onChange={handleChange}
                className="h-9"
                placeholder="252-058"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`h-9 ${formErrors.description ? 'border-red-500 focus:border-red-500' : ''}`}
              placeholder="PASTILLAS DE FRENO DELANTERAS"
            />
            {formErrors.description && (
              <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="supplier" className="text-sm font-medium">
              Proveedor
            </Label>
            <Select 
              value={formData.supplierId || ""} 
              onValueChange={(value) => handleSelectChange("supplier", value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar proveedor (opcional)">
                  {formData.supplierName || "Seleccionar proveedor (opcional)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="">Sin proveedor</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem 
                    key={supplier.id} 
                    value={supplier.id}
                    className="py-2.5 px-3 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
              disabled={loading || !!authError || registrationStatus.isDuplicate || registrationStatus.isChecking}
            >
              {loading && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {isEditing ? "Actualizar Material" : "Guardar Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}