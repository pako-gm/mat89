import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Supplier } from "@/types";
import { saveSupplier, getAllSuppliers } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
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
import { Switch } from "@/components/ui/switch";
import { AlertCircle } from "lucide-react";

interface SupplierFormProps {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSave: () => void;
  isEditing: boolean;
}

export default function SupplierForm({ 
  open, 
  supplier, 
  onClose, 
  onSave, 
  isEditing 
}: SupplierFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [nameStatus, setNameStatus] = useState<{
    isValid: boolean;
    isDuplicate: boolean;
    similarSuppliers: Supplier[];
    message: string;
  }>({
    isValid: true,
    isDuplicate: false,
    similarSuppliers: [],
    message: ""
  });
  
  const [formData, setFormData] = useState<Supplier>({
    id: "",
    name: "",
    address: "",
    city: "",
    postalCode: "",
    province: "",
    phone: "",
    email: "",
    contactPerson: "",
    isExternal: false,
    notes: ""
  });

  // Load all suppliers for duplicate checking
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const suppliers = await getAllSuppliers();
        setAllSuppliers(suppliers);
      } catch (error) {
        console.error("Error fetching suppliers for validation:", error);
      }
    };
    
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  useEffect(() => {
    if (supplier) {
      setFormData({
        id: supplier.id,
        name: supplier.name || "",
        address: supplier.address || "",
        city: supplier.city || "",
        postalCode: supplier.postalCode || "",
        province: supplier.province || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        contactPerson: supplier.contactPerson || "",
        isExternal: supplier.isExternal || false,
        notes: supplier.notes || ""
      });
    } else {
      setFormData({
        id: uuidv4(),
        name: "",
        address: "",
        city: "",
        postalCode: "",
        province: "",
        phone: "",
        email: "",
        contactPerson: "",
        isExternal: false,
        notes: ""
      });
    }
    setFormErrors({});
    setNameStatus({
      isValid: true,
      isDuplicate: false,
      similarSuppliers: [],
      message: ""
    });
  }, [supplier, open]);

  // Check for duplicate names
  useEffect(() => {
    if (!formData.name || !allSuppliers.length) return;
    
    const currentName = formData.name.trim().toLowerCase();
    if (currentName.length < 2) return;
    
    const currentId = formData.id;
    
    // Find exact match (excluding the current supplier if editing)
    const exactMatch = allSuppliers.find(s => 
      s.id !== currentId && 
      s.name.toLowerCase() === currentName
    );
    
    // Find similar names (excluding exact matches and current supplier)
    const similarNames = allSuppliers.filter(s => 
      s.id !== currentId && 
      s.name.toLowerCase() !== currentName &&
      s.name.toLowerCase().includes(currentName)
    );
    
    if (exactMatch) {
      setNameStatus({
        isValid: false,
        isDuplicate: true,
        similarSuppliers: [exactMatch],
        message: "Este nombre de proveedor ya existe en la base de datos."
      });
    } else if (similarNames.length > 0) {
      setNameStatus({
        isValid: true, // Still valid but with warning
        isDuplicate: false,
        similarSuppliers: similarNames,
        message: `Se encontraron ${similarNames.length} proveedores con nombres similares.`
      });
    } else {
      setNameStatus({
        isValid: true,
        isDuplicate: false,
        similarSuppliers: [],
        message: ""
      });
    }
  }, [formData.name, allSuppliers, formData.id]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      errors.name = "El nombre es obligatorio";
    } else if (nameStatus.isDuplicate) {
      errors.name = "Este nombre de proveedor ya existe";
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Formato de email inválido";
    }
    
    if (formData.phone && !/^[0-9+\s()-]{6,20}$/.test(formData.phone)) {
      errors.phone = "Formato de teléfono inválido";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is being edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isExternal: checked
    }));
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
    
    setLoading(true);
    
    try {
      await saveSupplier(formData);
      onSave();
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el proveedor. Por favor, inténtelo de nuevo.",
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
            {isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nombre empresa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`h-9 ${
                  formErrors.name || nameStatus.isDuplicate 
                    ? 'border-red-500 focus:border-red-500' 
                    : ''
                }`}
                placeholder="Nombre del proveedor"
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
              )}
              
              {/* Show similar/duplicate names */}
              {formData.name && nameStatus.message && (
                <div className={`text-xs mt-1 flex items-start gap-1 ${
                  nameStatus.isDuplicate ? 'text-red-500' : 'text-amber-600'
                }`}>
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{nameStatus.message}</p>
                    {nameStatus.similarSuppliers.length > 0 && (
                      <ul className="mt-1 ml-2">
                        {nameStatus.similarSuppliers.slice(0, 3).map(supplier => (
                          <li key={supplier.id}>- {supplier.name}</li>
                        ))}
                        {nameStatus.similarSuppliers.length > 3 && (
                          <li>... y {nameStatus.similarSuppliers.length - 3} más</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isExternal"
                  checked={formData.isExternal}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="isExternal" className="text-sm font-medium">
                  Proveedor Externo
                </Label>
              </div>
              
              <div className="flex justify-end">
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  formData.isExternal 
                    ? 'text-[#FF0000] bg-red-50' 
                    : 'text-[#008000] bg-green-50'
                }`}>
                  {formData.isExternal ? 'SI' : 'NO'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Dirección
            </Label>
            <Input
              id="address"
              name="address"
              value={formData.address || ""}
              onChange={handleChange}
              className="h-9"
              placeholder="Dirección"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium">
                Ciudad
              </Label>
              <Input
                id="city"
                name="city"
                value={formData.city || ""}
                onChange={handleChange}
                className="h-9"
                placeholder="Ciudad"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="postalCode" className="text-sm font-medium">
                Código Postal
              </Label>
              <Input
                id="postalCode"
                name="postalCode"
                value={formData.postalCode || ""}
                onChange={handleChange}
                className="h-9"
                placeholder="Código Postal"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="province" className="text-sm font-medium">
                Provincia
              </Label>
              <Input
                id="province"
                name="province"
                value={formData.province || ""}
                onChange={handleChange}
                className="h-9"
                placeholder="Provincia"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Teléfono
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className={`h-9 ${formErrors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Teléfono de contacto"
              />
              {formErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ""}
                onChange={handleChange}
                className={`h-9 ${formErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Email de contacto"
              />
              {formErrors.email && (
                <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactPerson" className="text-sm font-medium">
              Persona de contacto
            </Label>
            <Input
              id="contactPerson"
              name="contactPerson"
              value={formData.contactPerson || ""}
              onChange={handleChange}
              className="h-9"
              placeholder="Nombre de la persona de contacto"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas adicionales
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              className="min-h-[80px] resize-none"
              placeholder="Notas adicionales sobre el proveedor"
            />
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
              disabled={loading || nameStatus.isDuplicate}
            >
              {loading && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {isEditing ? "Actualizar Proveedor" : "Guardar Proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}