import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Material } from "@/types";
import { saveMaterial, checkMaterialRegistrationExists } from "@/lib/data";
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
import { Textarea } from "@/components/ui/textarea";
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
  onSave: (savedMaterial: Material) => void;
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

  // Estados para vehículos dinámicos
  const [vehiculos, setVehiculos] = useState<{ value: string; label: string }[]>([]);
  const [loadingVehiculos, setLoadingVehiculos] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<{
    isValid: boolean;
    isDuplicate: boolean;
    isChecking: boolean;
    message: string;
    startsWithWrong: boolean;
  }>({
    isValid: true,
    isDuplicate: false,
    isChecking: false,
    message: "",
    startsWithWrong: false
  });
  
  const [formData, setFormData] = useState<Material>({
    id: "",
    registration: 0,
    description: "",
    vehicleSeries: "",
    infoAdicional: "",
    supplierId: "",
    supplierName: ""
  });

  useEffect(() => {
    if (material) {
      setFormData({
        id: material.id,
        registration: material.registration || 0,
        description: material.description || "",
        vehicleSeries: material.vehicleSeries || "",
        infoAdicional: material.infoAdicional || "",
        supplierId: "",
        supplierName: ""
      });
    } else {
      setFormData({
        id: uuidv4(),
        registration: 0,
        description: "",
        vehicleSeries: "",
        infoAdicional: "",
        supplierId: "",
        supplierName: ""
      });
    }
    setFormErrors({});
    setRegistrationStatus({
      isValid: true,
      isDuplicate: false,
      isChecking: false,
      message: "",
      startsWithWrong: false
    });
    setAuthError(null);
  }, [material, open]);

  // Cargar vehículos desde la base de datos
  useEffect(() => {
    const fetchVehiculos = async () => {
      try {
        setLoadingVehiculos(true);
        const { data, error } = await supabase
          .from('tbl_vehiculos')
          .select('id, codigo_vehiculo, nombre_vehiculo')
          .order('codigo_vehiculo', { ascending: true });

        if (error) throw error;

        const mappedVehiculos = (data || []).map(v => ({
          value: v.codigo_vehiculo,
          label: v.nombre_vehiculo
            ? `${v.codigo_vehiculo} - ${v.nombre_vehiculo}`
            : v.codigo_vehiculo
        }));

        setVehiculos(mappedVehiculos);
      } catch (error: any) {
        console.error('Error cargando vehículos:', error);
        toast({
          title: "Error al cargar vehículos",
          description: error.message || "No se pudieron cargar las series de vehículos",
          variant: "destructive",
        });
      } finally {
        setLoadingVehiculos(false);
      }
    };

    fetchVehiculos();
  }, []);

  // Check for duplicate registration numbers
  useEffect(() => {
    const checkRegistration = async () => {
      if (!formData.registration || formData.registration <= 0) {
        setRegistrationStatus({
          isValid: true,
          isDuplicate: false,
          isChecking: false,
          message: "",
          startsWithWrong: false
        });
        return;
      }

      const regStr = formData.registration.toString();
      
      // Check if starts with wrong digits
      if (regStr.length > 0 && !regStr.startsWith('89')) {
        setRegistrationStatus({
          isValid: false,
          isDuplicate: false,
          isChecking: false,
          message: "La matrícula debe comenzar por 89",
          startsWithWrong: true
        });
        return;
      }

      setRegistrationStatus(prev => ({ ...prev, isChecking: true, startsWithWrong: false }));

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
            message: "Esta matrícula ya existe en la base de datos.",
            startsWithWrong: false
          });
        } else {
          setRegistrationStatus({
            isValid: true,
            isDuplicate: false,
            isChecking: false,
            message: "Matrícula disponible.",
            startsWithWrong: false
          });
        }
      } catch (error) {
        console.error("Error checking registration:", error);
        setRegistrationStatus({
          isValid: true,
          isDuplicate: false,
          isChecking: false,
          message: "",
          startsWithWrong: false
        });
      }
    };

    const timeoutId = setTimeout(checkRegistration, 2000); //de 500ms se ha AUMENTADO A 2000ms PARA EVITAR DEMASIADAS CONSULTAS
    return () => clearTimeout(timeoutId);
  }, [formData.registration, formData.id, isEditing]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.registration || formData.registration <= 0) {
      errors.registration = "La matrícula es obligatoria y debe comenzar por 89";
    } else {
      const regStr = formData.registration.toString();
      if (regStr.length !== 8) {
        errors.registration = "La matrícula debe tener exactamente 8 dígitos";
      } else if (!regStr.startsWith('89')) {
        errors.registration = "La matrícula debe comenzar por 89";
      } else if (registrationStatus.isDuplicate) {
        errors.registration = "Esta matrícula ya existe";
      }
    }

    if (!formData.description.trim()) {
      errors.description = "La descripción es obligatoria";
    }

    if (!formData.vehicleSeries || formData.vehicleSeries.trim() === "") {
      errors.vehicleSeries = "La serie de vehículo es obligatoria";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "registration") {
      // Remove any non-digit characters
      let cleanValue = value.replace(/\D/g, '');
      
      // Limit to 8 digits
      if (cleanValue.length > 8) {
        cleanValue = cleanValue.slice(0, 8);
      }
      
      // If it doesn't start with 89 and has more than 2 digits, prevent further input
      if (cleanValue.length > 2 && !cleanValue.startsWith('89')) {
        cleanValue = cleanValue.slice(0, 2);
      }
      
      const numValue = parseInt(cleanValue) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else if (name === "description") {
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
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
    // Convert the special "__none__" value back to empty string
    const actualValue = value === "__none__" ? "" : value;

    setFormData(prev => ({
      ...prev,
      [name]: actualValue
    }));

    // Clear error when field is being edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
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
      // Pasar el material guardado al callback
      onSave(formData);
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

  // Format the registration display value
  const getRegistrationDisplayValue = () => {
    if (!formData.registration || formData.registration === 0) {
      return '';
    }
    return formData.registration.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* estaba en 600px: sm:max-w-[900px] */}
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
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
                type="text"
                value={getRegistrationDisplayValue()}
                onChange={handleChange}
                className={`h-9 ${
                  formErrors.registration || registrationStatus.startsWithWrong || registrationStatus.isDuplicate
                    ? 'border-red-500 focus:border-red-500 text-red-500' 
                    : registrationStatus.isValid && formData.registration > 0 && registrationStatus.message && !registrationStatus.startsWithWrong
                    ? 'border-green-500 focus:border-green-500'
                    : ''
                }`}
                placeholder="89xxxxxx"
                maxLength={8}
              />
              {formErrors.registration && (
                <p className="text-xs text-red-500 mt-1">{formErrors.registration}</p>
              )}
              
              {/* Registration status indicator */}
              {formData.registration > 0 && registrationStatus.message && (
                <div className={`text-xs mt-1 flex items-center gap-1 ${
                  registrationStatus.isDuplicate || registrationStatus.startsWithWrong ? 'text-red-500' : 'text-green-600'
                }`}>
                  {registrationStatus.isChecking ? (
                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                  ) : (registrationStatus.isDuplicate || registrationStatus.startsWithWrong) ? (
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
                Serie Vehículo <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.vehicleSeries || "__none__"}
                onValueChange={(value) => handleSelectChange("vehicleSeries", value)}
              >
                <SelectTrigger className={`h-9 ${formErrors.vehicleSeries ? 'border-red-500 focus:border-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccione una serie" />
                </SelectTrigger>
                <SelectContent className="max-h-[160px] overflow-y-auto">
                  <SelectItem value="__none__">-- Elige serie vehiculo --</SelectItem>
                  {loadingVehiculos ? (
                    <SelectItem value="__loading__" disabled>Cargando...</SelectItem>
                  ) : (
                    vehiculos.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formErrors.vehicleSeries && (
                <p className="text-xs text-red-500 mt-1">{formErrors.vehicleSeries}</p>
              )}
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
              placeholder="Descripcion de la Pieza copiada de Maximo."
            />
            {formErrors.description && (
              <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="infoAdicional" className="text-sm font-medium">
              Información Adicional
            </Label>
            <Textarea
              id="infoAdicional"
              name="infoAdicional"
              value={formData.infoAdicional || ''}
              onChange={handleChange}
              className="min-h-[100px] resize-none"
              placeholder="Información adicional sobre el material..."
            />
            <p className="text-xs text-gray-500">
              Puede agregar aqui cualquier información relevante sobre el material.
            </p>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
              disabled={loading || !!authError || registrationStatus.isDuplicate || registrationStatus.isChecking || registrationStatus.startsWithWrong}
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