import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Order, OrderLine, ChangeHistoryItem } from "@/types";
import { warehouses, getSuppliers, saveOrder } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { hasAnyRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Save, 
  Edit3, 
  X, 
  Plus, 
  Trash2, 
  MessageCircle, 
  Upload 
} from "lucide-react";
import { filterManualChangeHistory, formatNewCommentStyle, formatDateToDDMMYYYY } from "@/lib/utils";
import OrderLineItem from "./OrderLineItem";
import MaterialNotFoundModal from "./MaterialNotFoundModal";
import MaterialAutocompleteInput, { MaterialAutocompleteInputRef } from "./MaterialAutocompleteInput";

type FormMode = 'create' | 'view' | 'edit';

interface OrderFormProps {
  order?: Order | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  mode?: FormMode;
}

interface Supplier {
  id: string;
  name: string;
}

export default function OrderForm({ 
  order, 
  open, 
  onClose, 
  onSave, 
  mode = 'create' 
}: OrderFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentMode, setCurrentMode] = useState<FormMode>(mode);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [showMaterialNotFoundModal, setShowMaterialNotFoundModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState("");
  const [pendingLineId, setPendingLineId] = useState("");
  const [newComment, setNewComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Order>({
    id: "",
    orderNumber: "",
    warehouse: "",
    supplierId: "",
    supplierName: "",
    vehicle: "",
    warranty: false,
    nonConformityReport: "",
    dismantleDate: "",
    shipmentDate: "",
    declaredDamage: "",
    shipmentDocumentation: [],
    changeHistory: [],
    orderLines: []
  });

  // Store original data for cancel functionality
  const [originalData, setOriginalData] = useState<Order | null>(null);

  // Initialize form data based on mode and order
  useEffect(() => {
    if (order) {
      setFormData(order);
      setOriginalData(order);
      setCurrentMode(mode);
    } else {
      // Create mode - initialize empty order
      const nextOrderNumber = generateNextOrderNumber();
      const emptyOrder: Order = {
        id: uuidv4(),
        orderNumber: nextOrderNumber,
        warehouse: "ALM141",
        supplierId: "",
        supplierName: "",
        vehicle: "",
        warranty: false,
        nonConformityReport: "",
        dismantleDate: "",
        shipmentDate: "",
        declaredDamage: "",
        shipmentDocumentation: [],
        changeHistory: [],
        orderLines: [{
          id: uuidv4(),
          registration: "",
          partDescription: "",
          quantity: 1,
          serialNumber: ""
        }]
      };
      setFormData(emptyOrder);
      setOriginalData(null);
      setCurrentMode('create');
    }
    
    setFormErrors({});
    setAuthError(null);
    setNewComment("");
    setShowCommentInput(false);
  }, [order, mode, open]);

  // Load suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const supplierData = await getSuppliers();
        setSuppliers(supplierData);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      }
    };
    
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  // Generate next order number
  const generateNextOrderNumber = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const defaultWarehouse = warehouses[0].code.replace('ALM', '');
    const timestamp = Date.now().toString().slice(-4);
    return `${defaultWarehouse}/${currentYear}/${timestamp}`;
  };

  // Get form title based on mode
  const getFormTitle = () => {
    switch (currentMode) {
      case 'create':
        return 'Nuevo Pedido';
      case 'view':
        return 'Detalles del Pedido';
      case 'edit':
        return 'Modificar Pedido';
      default:
        return 'Pedido';
    }
  };

  // Check if fields should be read-only
  const isReadOnly = () => {
    return currentMode === 'view';
  };

  // Form validation
  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.orderNumber.trim()) {
      errors.orderNumber = "El número de pedido es obligatorio";
    }
    
    if (!formData.supplierId) {
      errors.supplierId = "Debe seleccionar un proveedor";
    }
    
    if (!formData.warehouse) {
      errors.warehouse = "Debe seleccionar un almacén";
    }
    
    if (!formData.vehicle.trim()) {
      errors.vehicle = "El vehículo es obligatorio";
    }
    
    if (!formData.dismantleDate) {
      errors.dismantleDate = "La fecha de desmonte es obligatoria";
    }
    
    if (!formData.shipmentDate) {
      errors.shipmentDate = "La fecha de envío es obligatoria";
    }
    
    if (formData.orderLines.length === 0) {
      errors.orderLines = "Debe agregar al menos una línea de pedido";
    }
    
    // Validate order lines
    const lineErrors = formData.orderLines.some(line => 
      !line.registration || !line.partDescription || line.quantity <= 0
    );
    
    if (lineErrors) {
      errors.orderLines = "Todas las líneas deben tener matrícula, descripción y cantidad válida";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check user authentication and permissions
  const checkUserAuthentication = async () => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user || !data.user.id) {
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
      setAuthError("Error al verificar la autenticación.");
      return false;
    }
  };

  // Handle form submission
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

    const isAuthenticated = await checkUserAuthentication();
    if (!isAuthenticated) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Add new comment if provided
      let updatedOrder = { ...formData };
      if (newComment.trim()) {
        const commentItem: ChangeHistoryItem = {
          id: uuidv4(),
          date: new Date().toISOString(),
          user: (await supabase.auth.getUser()).data.user?.email || 'usuario@mat89.com',
          description: newComment.trim()
        };
        updatedOrder.changeHistory = [...updatedOrder.changeHistory, commentItem];
      }

      await saveOrder(updatedOrder);
      
      const actionText = currentMode === 'create' ? 'creado' : 'actualizado';
      toast({
        title: `Pedido ${actionText}`,
        description: `El pedido se ha ${actionText} correctamente`,
      });
      
      onSave();
      onClose();
      
    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el pedido. Por favor, inténtelo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle mode transitions
  const handleModeChange = (newMode: FormMode) => {
    setCurrentMode(newMode);
    setFormErrors({});
    setAuthError(null);
  };

  // Handle cancel action
  const handleCancel = () => {
    if (currentMode === 'edit' && originalData) {
      // Restore original data
      setFormData(originalData);
      setCurrentMode('view');
    } else {
      // Close form and return to order management
      onClose();
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is being edited
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  // Handle supplier selection
  const handleSupplierChange = (supplierId: string) => {
    const selectedSupplier = suppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplierId: supplierId,
      supplierName: selectedSupplier?.name || ""
    }));
    
    if (formErrors.supplierId) {
      setFormErrors(prev => ({ ...prev, supplierId: "" }));
    }
  };

  // Handle order line updates
  const handleOrderLineUpdate = (lineId: string, data: Partial<OrderLine>) => {
    setFormData(prev => ({
      ...prev,
      orderLines: prev.orderLines.map(line => 
        line.id === lineId ? { ...line, ...data } : line
      )
    }));
  };

  // Handle order line deletion
  const handleOrderLineDelete = (lineId: string) => {
    setFormData(prev => ({
      ...prev,
      orderLines: prev.orderLines.filter(line => line.id !== lineId)
    }));
  };

  // Handle adding new order line
  const handleAddOrderLine = () => {
    const newLine: OrderLine = {
      id: uuidv4(),
      registration: "",
      partDescription: "",
      quantity: 1,
      serialNumber: ""
    };
    
    setFormData(prev => ({
      ...prev,
      orderLines: [...prev.orderLines, newLine]
    }));
  };

  // Handle material not found
  const handleMaterialNotFound = (registration: string) => {
    setPendingRegistration(registration);
    setShowMaterialNotFoundModal(true);
  };

  // Handle material creation
  const handleCreateMaterial = () => {
    setShowMaterialNotFoundModal(false);
    navigate('/materiales', { 
      state: { 
        newMaterial: true, 
        registrationPreset: pendingRegistration 
      } 
    });
  };

  // Handle material not found cancel
  const handleMaterialNotFoundCancel = () => {
    // Clear the registration field for the line that triggered the modal
    if (pendingLineId) {
      handleOrderLineUpdate(pendingLineId, { registration: "" });
    }
    setShowMaterialNotFoundModal(false);
    setPendingRegistration("");
    setPendingLineId("");
  };

  // Handle add comment
  const handleAddComment = () => {
    if (newComment.trim()) {
      const commentItem: ChangeHistoryItem = {
        id: uuidv4(),
        date: new Date().toISOString(),
        user: 'usuario@mat89.com', // This will be updated in handleSubmit
        description: newComment.trim()
      };
      
      setFormData(prev => ({
        ...prev,
        changeHistory: [...prev.changeHistory, commentItem]
      }));
      
      setNewComment("");
      setShowCommentInput(false);
    }
  };

  // Render read-only input
  const renderReadOnlyInput = (value: string, label: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
        {value || "--"}
      </div>
    </div>
  );

  // Render read-only textarea
  const renderReadOnlyTextarea = (value: string, label: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <div className="min-h-[80px] px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
        {value || "--"}
      </div>
    </div>
  );

  // Render read-only select
  const renderReadOnlySelect = (value: string, label: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
        {value || "--"}
      </div>
    </div>
  );

  // Render read-only switch
  const renderReadOnlySwitch = (value: boolean, label: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
        {value ? "Sí" : "No"}
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{getFormTitle()}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DialogHeader>
          
          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{authError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber" className="text-sm font-medium">
                  Num. Pedido <span className="text-red-500">*</span>
                </Label>
                {isReadOnly() ? (
                  <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formData.orderNumber}
                  </div>
                ) : (
                  <Input
                    id="orderNumber"
                    value={formData.orderNumber}
                    onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                    className={`h-9 ${formErrors.orderNumber ? 'border-red-500' : ''}`}
                    placeholder="Número de pedido"
                  />
                )}
                {formErrors.orderNumber && (
                  <p className="text-xs text-red-500">{formErrors.orderNumber}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-sm font-medium">
                  Razón Social <span className="text-red-500">*</span>
                </Label>
                {isReadOnly() ? (
                  <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formData.supplierName}
                  </div>
                ) : (
                  <Select
                    value={formData.supplierId || "__none__"}
                    onValueChange={handleSupplierChange}
                  >
                    <SelectTrigger className={`h-9 ${formErrors.supplierId ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleccione un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccione un proveedor</SelectItem>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {formErrors.supplierId && (
                  <p className="text-xs text-red-500">{formErrors.supplierId}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="warehouse" className="text-sm font-medium">
                  Almacén <span className="text-red-500">*</span>
                </Label>
                {isReadOnly() ? (
                  <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formData.warehouse}
                  </div>
                ) : (
                  <Select
                    value={formData.warehouse || "__none__"}
                    onValueChange={(value) => handleInputChange('warehouse', value === "__none__" ? "" : value)}
                  >
                    <SelectTrigger className={`h-9 ${formErrors.warehouse ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleccione un almacén" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccione un almacén</SelectItem>
                      {warehouses.map(warehouse => (
                        <SelectItem key={warehouse.id} value={warehouse.code}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {formErrors.warehouse && (
                  <p className="text-xs text-red-500">{formErrors.warehouse}</p>
                )}
              </div>
            </div>

            {/* Vehicle and Warranty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle" className="text-sm font-medium">
                  Vehículo <span className="text-red-500">*</span>
                </Label>
                {isReadOnly() ? (
                  <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formData.vehicle}
                  </div>
                ) : (
                  <Input
                    id="vehicle"
                    value={formData.vehicle}
                    onChange={(e) => handleInputChange('vehicle', e.target.value)}
                    className={`h-9 ${formErrors.vehicle ? 'border-red-500' : ''}`}
                    placeholder="Vehículo"
                  />
                )}
                {formErrors.vehicle && (
                  <p className="text-xs text-red-500">{formErrors.vehicle}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Garantía</Label>
                {isReadOnly() ? (
                  <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formData.warranty ? "Sí" : "No"}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 h-9">
                    <Switch
                      id="warranty"
                      checked={formData.warranty}
                      onCheckedChange={(checked) => handleInputChange('warranty', checked)}
                    />
                    <Label htmlFor="warranty" className="text-sm">
                      {formData.warranty ? "Sí" : "No"}
                    </Label>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dismantleDate" className="text-sm font-medium">
                  Fecha Desmonte <span className="text-red-500">*</span>
                </Label>
                {isReadOnly() ? (
                  <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formatDateToDDMMYYYY(formData.dismantleDate)}
                  </div>
                ) : (
                  <Input
                    id="dismantleDate"
                    type="date"
                    value={formData.dismantleDate}
                    onChange={(e) => handleInputChange('dismantleDate', e.target.value)}
                    className={`h-9 ${formErrors.dismantleDate ? 'border-red-500' : ''}`}
                  />
                )}
                {formErrors.dismantleDate && (
                  <p className="text-xs text-red-500">{formErrors.dismantleDate}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shipmentDate" className="text-sm font-medium">
                  Fecha Envío <span className="text-red-500">*</span>
                </Label>
                {isReadOnly() ? (
                  <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formatDateToDDMMYYYY(formData.shipmentDate)}
                  </div>
                ) : (
                  <Input
                    id="shipmentDate"
                    type="date"
                    value={formData.shipmentDate}
                    onChange={(e) => handleInputChange('shipmentDate', e.target.value)}
                    className={`h-9 ${formErrors.shipmentDate ? 'border-red-500' : ''}`}
                  />
                )}
                {formErrors.shipmentDate && (
                  <p className="text-xs text-red-500">{formErrors.shipmentDate}</p>
                )}
              </div>
            </div>

            {/* Text Areas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="declaredDamage" className="text-sm font-medium">
                  Avería Declarada
                </Label>
                {isReadOnly() ? (
                  <div className="min-h-[80px] px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formData.declaredDamage || "--"}
                  </div>
                ) : (
                  <Textarea
                    id="declaredDamage"
                    value={formData.declaredDamage}
                    onChange={(e) => handleInputChange('declaredDamage', e.target.value)}
                    className="min-h-[80px] resize-none"
                    placeholder="Descripción de la avería"
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nonConformityReport" className="text-sm font-medium">
                  Informe No Conformidad
                </Label>
                {isReadOnly() ? (
                  <div className="min-h-[80px] px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                    {formData.nonConformityReport || "--"}
                  </div>
                ) : (
                  <Textarea
                    id="nonConformityReport"
                    value={formData.nonConformityReport}
                    onChange={(e) => handleInputChange('nonConformityReport', e.target.value)}
                    className="min-h-[80px] resize-none"
                    placeholder="Informe de no conformidad"
                  />
                )}
              </div>
            </div>

            {/* Documentation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Documentación Envío</Label>
              {isReadOnly() ? (
                <div className="h-9 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                  {formData.shipmentDocumentation.length > 0 ? 
                    formData.shipmentDocumentation.join(", ") : 
                    "No hay documentación"
                  }
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Arrastra y suelta aquí la documentación asociada al envío o haga clic para seleccionar
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Tipos permitidos: .pdf, .jpg, .png, .doc, .docx - máximo 3 MB cada uno
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Comentarios del Usuario
                </Label>
                {!isReadOnly() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommentInput(!showCommentInput)}
                    className="text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Agregar Comentario
                  </Button>
                )}
              </div>
              
              {showCommentInput && (
                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe tu comentario aquí..."
                    className="min-h-[80px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      Agregar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCommentInput(false);
                        setNewComment("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                {filterManualChangeHistory(formData.changeHistory).length > 0 ? (
                  filterManualChangeHistory(formData.changeHistory).map((comment, index) => (
                    <div key={comment.id} className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                        {formatNewCommentStyle(comment)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <MessageCircle className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                    <p className="text-sm">No hay comentarios registrados</p>
                    <p className="text-xs mt-1">
                      Use el botón "Agregar Comentario" para añadir observaciones
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Líneas de Pedido</Label>
                {!isReadOnly() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOrderLine}
                    className="text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Línea
                  </Button>
                )}
              </div>
              
              {formErrors.orderLines && (
                <p className="text-xs text-red-500">{formErrors.orderLines}</p>
              )}
              
              <div className="space-y-2">
                <div className="grid grid-cols-[2fr,3fr,1fr,2fr,auto] gap-4 py-2 text-sm font-medium text-gray-600 border-b">
                  <div>Matrícula 89</div>
                  <div>Descripción Pieza</div>
                  <div>Cant.</div>
                  <div>Num. Serie</div>
                  <div>Acciones</div>
                </div>
                
                {formData.orderLines.map((line, index) => (
                  <div key={line.id}>
                    {isReadOnly() ? (
                      <div className="grid grid-cols-[2fr,3fr,1fr,2fr,auto] gap-4 py-2 text-sm border-b">
                        <div>{line.registration}</div>
                        <div>{line.partDescription}</div>
                        <div>{line.quantity}</div>
                        <div>{line.serialNumber}</div>
                        <div>--</div>
                      </div>
                    ) : (
                      <OrderLineItem
                        key={line.id}
                        orderLine={line}
                        onDelete={handleOrderLineDelete}
                        onUpdate={handleOrderLineUpdate}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>
          
          {/* Action Buttons */}
          <DialogFooter className="flex justify-end gap-3 mt-6">
            {currentMode === 'view' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleModeChange('edit')}
                  className="bg-[#91268F] text-white border-[#91268F] hover:bg-[#7A1F79] hover:border-[#7A1F79]"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Modificar Pedido
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
              </>
            )}
            
            {(currentMode === 'create' || currentMode === 'edit') && (
              <>
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !!authError}
                  className="bg-[#91268F] text-white hover:bg-[#7A1F79]"
                >
                  {loading && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  )}
                  <Save className="h-4 w-4 mr-2" />
                  {currentMode === 'create' ? 'Guardar Pedido' : 'Actualizar Pedido'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Not Found Modal */}
      <MaterialNotFoundModal
        open={showMaterialNotFoundModal}
        registration={pendingRegistration}
        onClose={() => setShowMaterialNotFoundModal(false)}
        onCreateMaterial={handleCreateMaterial}
        onCancel={handleMaterialNotFoundCancel}
      />
    </>
  );
}