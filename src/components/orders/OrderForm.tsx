import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { Order, OrderLine } from "@/types";
import { warehouses, getSuppliers, saveOrder } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { hasAnyRole } from "@/lib/auth";
import { filterManualChangeHistory, formatDateToDDMMYYYY } from "@/lib/utils";
import MaterialNotFoundModal from "./MaterialNotFoundModal";
import MaterialAutocompleteInput, { MaterialAutocompleteInputRef } from "./MaterialAutocompleteInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
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
import { Upload, PlusCircle, Trash2, Check, MessageCircle, Send, User, Clock, Edit2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface OrderFormProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  isEditing: boolean;
}

export default function OrderForm({
  order: initialOrder,
  open,
  onClose,
  onSave,
  isEditing: initialIsEditing
}: OrderFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [materialNotFoundModal, setMaterialNotFoundModal] = useState<{
    open: boolean;
    registration: string;
    lineId: string;
  }>({ open: false, registration: "", lineId: "" });
  const [errors, setErrors] = useState({
    supplier: false,
    vehicle: false,
    dismantleDate: false,
    shipmentDate: false,
    orderLines: false
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Referencias para los inputs de matrícula
  const materialInputRefs = useRef<Map<string, MaterialAutocompleteInputRef>>(new Map());

  // Initialize order state with proper defaults
  const [order, setOrder] = useState<Order>(() => {
    return {
      id: initialOrder.id || uuidv4(),
      orderNumber: initialOrder.orderNumber || "",
      warehouse: initialOrder.warehouse || "ALM141",
      supplierId: initialOrder.supplierId || "",
      supplierName: initialOrder.supplierName || "",
      vehicle: initialOrder.vehicle || "",
      warranty: initialOrder.warranty || false,
      nonConformityReport: initialOrder.nonConformityReport || "",
      dismantleDate: initialOrder.dismantleDate || "",
      shipmentDate: initialOrder.shipmentDate || "",
      declaredDamage: initialOrder.declaredDamage || "",
      shipmentDocumentation: initialOrder.shipmentDocumentation || [],
      changeHistory: initialOrder.changeHistory || [],
      orderLines: initialOrder.orderLines?.length > 0
        ? initialOrder.orderLines.map(line => ({
          ...line,
          quantity: typeof line.quantity === 'number' && line.quantity > 0 ? line.quantity : 1
        }))
        : [{
          id: uuidv4(),
          registration: "",
          partDescription: "",
          quantity: 1,
          serialNumber: ""
        }]
    };
  });

  // Reset form when order changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      const newOrder = {
        id: initialOrder.id || uuidv4(),
        orderNumber: initialOrder.orderNumber || "",
        warehouse: initialOrder.warehouse || "ALM141",
        supplierId: initialOrder.supplierId || "",
        supplierName: initialOrder.supplierName || "",
        vehicle: initialOrder.vehicle || "",
        warranty: initialOrder.warranty || false,
        nonConformityReport: initialOrder.nonConformityReport || "",
        dismantleDate: initialOrder.dismantleDate || "",
        shipmentDate: initialOrder.shipmentDate || "",
        declaredDamage: initialOrder.declaredDamage || "",
        shipmentDocumentation: initialOrder.shipmentDocumentation || [],
        changeHistory: initialOrder.changeHistory || [],
        orderLines: initialOrder.orderLines?.length > 0
          ? initialOrder.orderLines.map(line => ({
            ...line,
            quantity: typeof line.quantity === 'number' && line.quantity > 0 ? line.quantity : 1
          }))
          : [{
            id: uuidv4(),
            registration: "",
            partDescription: "",
            quantity: 1,
            serialNumber: ""
          }]
      };

      setOrder(newOrder);
      setHasChanges(false);

      // Clear errors when opening
      setErrors({
        supplier: false,
        vehicle: false,
        dismantleDate: false,
        shipmentDate: false,
        orderLines: false
      });
    }
  }, [open, initialOrder, initialIsEditing]);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const data = await getSuppliers();
        setSuppliers(data);
      } catch (error) {
        console.error('Error loading suppliers:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los proveedores.",
        });
      }
    };

    if (open) {
      loadSuppliers();
      //checkUserAuthentication();
    }
  }, [open, toast]);

  // Mark as changed whenever user modifies something
  const markAsChanged = () => {
    console.log('markAsChanged called, current hasChanges:', hasChanges);
    if (!hasChanges) {
      console.log('Setting hasChanges to true');
      setHasChanges(true);
    }
  };

  // Handle close with confirmation if there are changes
  const handleClose = () => {
    if (hasChanges) {
      setShowConfirmModal(true);
    } else {
      onClose();
    }
  };

  // Discard changes and close
  const handleDiscardChanges = () => {
    setShowConfirmModal(false);
    setHasChanges(false);
    onClose();
  };

  // Save changes and close
  const handleUpdateOrder = async () => {
    setShowConfirmModal(false);
    // Create a fake event to pass to handleSubmit
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };

  // Determinar el título basado en el modo actual
  const getTitle = () => {
    return initialIsEditing ? "Editar Pedido" : "Nuevo Pedido";
  };

  // Always in edit mode now
  const isReadOnly = false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    markAsChanged(); // Mark as changed when user types
    const { name, value } = e.target;

    // Validate dismantle date is before shipment date
    if (name === "dismantleDate") {
      if (order.shipmentDate && value > order.shipmentDate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "La fecha de desmonte debe ser anterior a la fecha de envío",
        });
        return;
      }
    }

    // Validate shipment date is after dismantle date
    if (name === "shipmentDate") {
      if (order.dismantleDate && value < order.dismantleDate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "La fecha de envío debe ser posterior a la fecha de desmonte",
        });
        return;
      }
    }

    if (name === "orderNumber") {
      // Extract warehouse number from selected warehouse
      const warehouseNum = order.warehouse.replace('ALM', '');
      // Format: warehouseNum/YY/sequential
      let formattedValue = value.replace(/\D/g, ''); // Remove non-digits
      if (formattedValue.length > 4) {
        formattedValue = formattedValue.slice(0, 4); // Limit to 4 digits for sequential
      }
      if (formattedValue) {
        // Pad sequential number to 4 digits
        const sequential = formattedValue.padStart(4, '0');
        const currentYear = new Date().getFullYear().toString().slice(-2);
        formattedValue = `${warehouseNum}/${currentYear}/${sequential}`;
      }
      setOrder(prev => ({
        ...prev,
        orderNumber: formattedValue
      }));
      return;
    }

    setOrder(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear relevant errors when user starts typing
    if (name === "vehicle" && errors.vehicle) {
      setErrors(prev => ({ ...prev, vehicle: false }));
    }
    if (name === "dismantleDate" && errors.dismantleDate) {
      setErrors(prev => ({ ...prev, dismantleDate: false }));
    }
    if (name === "shipmentDate" && errors.shipmentDate) {
      setErrors(prev => ({ ...prev, shipmentDate: false }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (isReadOnly) return;
    markAsChanged();

    if (name === "warehouse") {
      // Update order number when warehouse changes
      const warehouseNum = value.replace('ALM', '');
      const sequential = order.orderNumber.split('/')[2] || '1000';
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const newOrderNumber = `${warehouseNum}/${currentYear}/${sequential}`;
      setOrder(prev => ({
        ...prev,
        warehouse: value,
        orderNumber: newOrderNumber
      }));
      return;
    }

    if (name === "supplier") {
      // Find the selected supplier to get both ID and name
      const selectedSupplier = suppliers.find(s => s.id === value);
      if (selectedSupplier) {
        setOrder(prev => ({
          ...prev,
          supplierId: selectedSupplier.id,
          supplierName: selectedSupplier.name
        }));

        // Clear supplier error
        if (errors.supplier) {
          setErrors(prev => ({ ...prev, supplier: false }));
        }
      }
      return;
    }

    setOrder(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    if (isReadOnly) return;
    markAsChanged();

    setOrder(prev => ({
      ...prev,
      warranty: checked,
      nonConformityReport: checked ? prev.nonConformityReport : "" // Clear NC report when warranty is disabled
    }));
  };

  const handleOrderLineUpdate = (id: string, data: Partial<OrderLine>) => {
    if (isReadOnly) return;
    markAsChanged();

    setOrder(prev => ({
      ...prev,
      orderLines: prev.orderLines.map(line => {
        if (line.id === id) {
          const updatedLine = { ...line, ...data };
          // Ensure quantity is always a valid number
          if ('quantity' in data) {
            const quantity = typeof data.quantity === 'number' ? data.quantity : parseInt(String(data.quantity), 10);
            updatedLine.quantity = isNaN(quantity) || quantity < 1 ? 1 : quantity;
          }
          return updatedLine;
        }
        return line;
      })
    }));

    // Clear orderLines error when user starts typing in registration field
    if ('registration' in data && data.registration && errors.orderLines) {
      setErrors(prev => ({
        ...prev,
        orderLines: false
      }));
    }
  };

  // Nueva función para manejar la actualización de matrícula con autorrellenado
  const handleMaterialRegistrationChange = (lineId: string, registration: string, description?: string) => {
    if (isReadOnly) return;
    markAsChanged();

    setOrder(prev => ({
      ...prev,
      orderLines: prev.orderLines.map(line => {
        if (line.id === lineId) {
          return {
            ...line,
            registration,
            partDescription: description || line.partDescription
          };
        }
        return line;
      })
    }));

    // Clear orderLines error when user starts typing in registration field
    if (registration && errors.orderLines) {
      setErrors(prev => ({
        ...prev,
        orderLines: false
      }));
    }
  };

  // Nueva función para manejar material no encontrado
  const handleMaterialNotFound = (registration: string, lineId?: string) => {
    if (isReadOnly) return;

    // Encontrar el ID de línea si no se proporciona
    let targetLineId = lineId;
    if (!targetLineId) {
      const targetLine = order.orderLines.find(line => String(line.registration) === registration);
      targetLineId = targetLine?.id || "";
    }

    setMaterialNotFoundModal({
      open: true,
      registration,
      lineId: targetLineId
    });
  };

  // Nueva función para manejar cancelación del modal
  const handleMaterialNotFoundCancel = () => {
    const { lineId } = materialNotFoundModal;

    // Limpiar el campo de matrícula de la línea específica
    if (lineId) {
      setOrder(prev => ({
        ...prev,
        orderLines: prev.orderLines.map(line => {
          if (line.id === lineId) {
            return {
              ...line,
              registration: "",
              partDescription: ""
            };
          }
          return line;
        })
      }));

      // Devolver focus al input correspondiente
      const inputRef = materialInputRefs.current.get(lineId);
      if (inputRef) {
        setTimeout(() => {
          inputRef.focus();
        }, 100);
      }
    }

    // Cerrar el modal
    setMaterialNotFoundModal({ open: false, registration: "", lineId: "" });
  };

  // Nueva función para redirigir a crear material
  const handleCreateMaterial = () => {
    setMaterialNotFoundModal({ open: false, registration: "", lineId: "" });
    // Cerrar el formulario actual y navegar a materiales
    onClose();
    navigate('/materiales', {
      state: {
        newMaterial: true,
        registrationPreset: materialNotFoundModal.registration
      }
    });
  };

  const handleOrderLineDelete = (id: string) => {
    if (isReadOnly) return;

    console.log('Deleting order line, marking as changed');
    markAsChanged();

    if (order.orderLines.length > 1) {
      setOrder(prev => ({
        ...prev,
        orderLines: prev.orderLines.filter(line => line.id !== id)
      }));
      // Limpiar referencia del input
      materialInputRefs.current.delete(id);
    } else {
      console.log('Cannot delete - only one line remaining');
    }
  };

  const addOrderLine = () => {
    if (isReadOnly) return;

    // Check if there are any existing lines with empty registration
    const hasEmptyRegistration = order.orderLines.some(line => !String(line.registration).trim());

    if (hasEmptyRegistration) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "No pueden haber líneas vacías",
      });

      // Set orderLines error to highlight the problematic lines
      setErrors(prev => ({
        ...prev,
        orderLines: true
      }));

      return; // Don't add the new line
    }

    markAsChanged();
    // If all existing lines have registration, add the new line
    setOrder(prev => ({
      ...prev,
      orderLines: [...prev.orderLines, {
        id: uuidv4(),
        registration: "",
        partDescription: "",
        quantity: 1,
        serialNumber: ""
      }]
    }));
  };

  // MEJORADO: Función para agregar comentarios con mejor logging
  const handleAddComment = async () => {
    if (isReadOnly) return;

    if (newComment.trim()) {
      console.log('=== AGREGANDO COMENTARIO ===');
      console.log('Texto del comentario:', newComment.trim());

      try {
        // Obtener el email del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || 'admin@renfe.es';

        console.log('Usuario actual:', userEmail);

        const newChange = {
          id: uuidv4(),
          date: new Date().toISOString(),
          user: userEmail,
          description: newComment.trim()
        };

        console.log('Nuevo comentario creado:', newChange);

        setOrder(prev => {
          const updatedHistory = [...prev.changeHistory, newChange];
          console.log('ChangeHistory actualizado:', updatedHistory);
          return {
            ...prev,
            changeHistory: updatedHistory
          };
        });

        setNewComment("");
        setIsCommentOpen(false);

        toast({
          title: "Comentario agregado",
          description: "El comentario se ha agregado al pedido. Recuerde guardar los cambios.",
        });

        console.log('=== COMENTARIO AGREGADO EXITOSAMENTE ===');
      } catch (error) {
        console.error('Error al agregar comentario:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo agregar el comentario.",
        });
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    if (isReadOnly) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    const validTypes = ['.pdf', '.jpeg', '.jpg', '.xlsx', '.zip'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = validTypes.includes(extension);
    const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
    return isValidType && isValidSize;
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isReadOnly) return;

    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      if (order.shipmentDocumentation.length + files.length > 4) {
        alert('Máximo 4 archivos permitidos');
        return;
      }

      const validFiles = files.filter(validateFile);
      if (validFiles.length !== files.length) {
        alert('Algunos archivos no cumplen con los requisitos de formato o tamaño');
      }

      setOrder(prev => ({
        ...prev,
        shipmentDocumentation: [
          ...prev.shipmentDocumentation,
          ...validFiles.map(file => file.name)
        ].slice(0, 4)
      }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;

    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (order.shipmentDocumentation.length + files.length > 4) {
        alert('Máximo 4 archivos permitidos');
        return;
      }

      const validFiles = files.filter(validateFile);
      if (validFiles.length !== files.length) {
        alert('Algunos archivos no cumplen con los requisitos de formato o tamaño');
      }

      setOrder(prev => ({
        ...prev,
        shipmentDocumentation: [
          ...prev.shipmentDocumentation,
          ...validFiles.map(file => file.name)
        ].slice(0, 4)
      }));
    }
  };

  const removeFile = (fileName: string) => {
    if (isReadOnly) return;
    markAsChanged();

    setOrder(prev => ({
      ...prev,
      shipmentDocumentation: prev.shipmentDocumentation.filter(f => f !== fileName)
    }));
  };

  const validateForm = () => {
    // Check if there's at least one order line with a registration
    const hasValidOrderLine = order.orderLines.some(line => String(line.registration).trim() !== "");

    const newErrors = {
      supplier: !order.supplierId,
      vehicle: !order.vehicle.trim(),
      dismantleDate: !order.dismantleDate,
      shipmentDate: !order.shipmentDate,
      orderLines: !hasValidOrderLine
    };

    setErrors(newErrors);

    return !Object.values(newErrors).some(Boolean);
  };

  const checkUserAuthentication = async () => {
    try {
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

      // Verificar permisos del usuario según su rol
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

    // Check if user is authenticated before proceeding
    const isAuthenticated = await checkUserAuthentication();
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);

    try {
      let updatedOrder = { ...order };

      // Ensure all order lines have valid quantities before saving
      updatedOrder.orderLines = updatedOrder.orderLines.map(line => ({
        ...line,
        quantity: typeof line.quantity === 'number' && line.quantity > 0 ? line.quantity : 1
      }));

      console.log('=== GUARDANDO PEDIDO ===');
      console.log('ChangeHistory antes de guardar:', updatedOrder.changeHistory);

      await saveOrder(updatedOrder);

      console.log('=== PEDIDO GUARDADO EXITOSAMENTE ===');

      onSave();

    } catch (error) {
      console.error("Error saving order:", error);
      let errorMessage = "No se pudo guardar el pedido. Por favor, inténtelo de nuevo.";

      if (error instanceof Error) {
        errorMessage = error.message;
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

  // Filtrar solo comentarios manuales para mostrar en el histórico
  const manualChangeHistory = filterManualChangeHistory(order.changeHistory);

  // Función para renderizar un input en modo lectura
  const renderReadOnlyInput = (value: string, placeholder?: string) => (
    <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm flex items-center">
      {value || placeholder || "--"}
    </div>
  );

  // Función para renderizar un textarea en modo lectura
  const renderReadOnlyTextarea = (value: string, placeholder?: string) => (
    <div className="min-h-[100px] px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm">
      {value || placeholder || "--"}
    </div>
  );

  // Función para renderizar un select en modo lectura
  const renderReadOnlySelect = (value: string, options: any[], getLabel: (option: any) => string) => {
    const selectedOption = options.find(opt => opt.id === value || opt.code === value || opt.value === value);
    return (
      <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm flex items-center">
        {selectedOption ? getLabel(selectedOption) : "--"}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
          </DialogHeader>


          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="orderNumber" className="text-sm mb-1">Num. Pedido</Label>
                {isReadOnly ? (
                  renderReadOnlyInput(order.orderNumber, `${order.warehouse.replace('ALM', '')}/25/1001`)
                ) : (
                  <Input
                    id="orderNumber"
                    name="orderNumber"
                    value={order.orderNumber}
                    readOnly
                    placeholder={`${order.warehouse.replace('ALM', '')}/25/1001`}
                    className="h-9 border-[#4C4C4C] bg-gray-100 cursor-not-allowed text-[#4C4C4C]"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="supplier" className="text-sm mb-1">
                  <span className="text-red-500">*</span> Razón Social
                  {errors.supplier && !isReadOnly && (
                    <span className="text-red-500 text-xs ml-2">Campo requerido</span>
                  )}
                </Label>
                {isReadOnly ? (
                  renderReadOnlySelect(order.supplierId, suppliers, (s) => s.name)
                ) : (
                  <Select
                    value={order.supplierId}
                    onValueChange={(value) => handleSelectChange("supplier", value)}
                  >
                    <SelectTrigger className={`h-9 border-[#4C4C4C] ${errors.supplier ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleccione un Proveedor">
                        {order.supplierName || "Seleccione un Proveedor"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px] overflow-y-auto">
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
                )}
              </div>

              <div>
                <Label htmlFor="warehouse" className="text-sm mb-1">Almacén</Label>
                {isReadOnly ? (
                  renderReadOnlySelect(order.warehouse, warehouses, (w) => w.code)
                ) : (
                  <Select
                    value={order.warehouse}
                    onValueChange={(value) => handleSelectChange("warehouse", value)}
                    defaultValue="ALM141"
                  >
                    <SelectTrigger className="h-9 border-[#4C4C4C]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(warehouse => (
                        <SelectItem key={warehouse.id} value={warehouse.code}>
                          {warehouse.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vehicle" className="text-sm mb-1">
                  <span className="text-red-500">*</span> Vehículo
                  {errors.vehicle && !isReadOnly && (
                    <span className="text-red-500 text-xs ml-2">Campo requerido</span>
                  )}
                </Label>
                {isReadOnly ? (
                  renderReadOnlyInput(order.vehicle, "252-058")
                ) : (
                  <Input
                    id="vehicle"
                    name="vehicle"
                    value={order.vehicle.replace(/[^\d-]/g, '')}
                    onChange={(e) => {
                      markAsChanged();
                      let value = e.target.value.replace(/[^\d]/g, '');
                      if (value.length > 3 && !value.includes('-')) {
                        value = value.slice(0, 3) + '-' + value.slice(3);
                      }
                      if (value.length > 7) {
                        value = value.slice(0, 7);
                      }
                      setOrder(prev => ({
                        ...prev,
                        vehicle: value
                      }));
                    }}
                    onFocus={(e) => e.target.placeholder = ""}
                    onBlur={(e) => e.target.placeholder = "252-058"}
                    placeholder="252-058"
                    className={`h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F] text-[#4C4C4C] ${errors.vehicle ? 'border-red-500' : ''}`}
                  />
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-6">
                <Label htmlFor="warranty" className="text-sm">Garantía</Label>
                {isReadOnly ? (
                  <div className="text-sm text-gray-700">
                    {order.warranty ? "Sí" : "No"}
                  </div>
                ) : (
                  <Switch
                    defaultChecked={false}
                    id="warranty"
                    checked={order.warranty}
                    onCheckedChange={handleSwitchChange}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="nonConformityReport" className="text-sm mb-1">Informe No Conformidad</Label>
                {isReadOnly ? (
                  renderReadOnlyInput(order.nonConformityReport, "Informe NC")
                ) : (
                  <Input
                    disabled={!order.warranty}
                    id="nonConformityReport"
                    name="nonConformityReport"
                    value={order.nonConformityReport.toUpperCase()}
                    onChange={(e) => {
                      if (order.warranty) {
                        markAsChanged();
                        const value = e.target.value.toUpperCase();
                        setOrder(prev => ({
                          ...prev,
                          nonConformityReport: value
                        }));
                      }
                    }}
                    onFocus={(e) => e.target.placeholder = ""}
                    onBlur={(e) => e.target.placeholder = "Informe NC"}
                    placeholder="Informe NC"
                    className={`h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F] text-[#4C4C4C] ${!order.warranty ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dismantleDate" className="text-sm mb-1">
                  <span className="text-red-500">*</span> Fecha Desmonte
                  {errors.dismantleDate && !isReadOnly && (
                    <span className="text-red-500 text-xs ml-2">
                      {order.shipmentDate && order.dismantleDate > order.shipmentDate
                        ? "Debe ser anterior a la fecha de envío"
                        : "Campo requerido"}
                    </span>
                  )}
                </Label>
                {isReadOnly ? (
                  renderReadOnlyInput(formatDateToDDMMYYYY(order.dismantleDate))
                ) : (
                  <Input
                    id="dismantleDate"
                    name="dismantleDate"
                    type="date"
                    max={order.shipmentDate || undefined}
                    value={order.dismantleDate}
                    onChange={handleChange}
                    className={`h-9 border-[#4C4C4C] focus:border-[#91268F] text-[#4C4C4C] ${errors.dismantleDate ? 'border-red-500' : ''}`}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="shipmentDate" className="text-sm mb-1">
                  <span className="text-red-500">*</span> Fecha Envío
                  {errors.shipmentDate && !isReadOnly && (
                    <span className="text-red-500 text-xs ml-2">
                      {order.dismantleDate && order.shipmentDate < order.dismantleDate
                        ? "Debe ser posterior a la fecha de desmonte"
                        : "Campo requerido"}
                    </span>
                  )}
                </Label>
                {isReadOnly ? (
                  renderReadOnlyInput(formatDateToDDMMYYYY(order.shipmentDate))
                ) : (
                  <Input
                    id="shipmentDate"
                    name="shipmentDate"
                    type="date"
                    min={order.dismantleDate || undefined}
                    value={order.shipmentDate}
                    onChange={handleChange}
                    className={`h-9 border-[#4C4C4C] focus:border-[#91268F] text-[#4C4C4C] ${errors.shipmentDate ? 'border-red-500' : ''}`}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="declaredDamage" className="text-sm mb-1">Avería Declarada</Label>
                {isReadOnly ? (
                  renderReadOnlyTextarea(order.declaredDamage, "Apuntado en Tarjeta Identificativa")
                ) : (
                  <Textarea
                    id="declaredDamage"
                    name="declaredDamage"
                    value={order.declaredDamage.toUpperCase()}
                    onChange={(e) => {
                      markAsChanged();
                      const value = e.target.value.toUpperCase();
                      setOrder(prev => ({
                        ...prev,
                        declaredDamage: value
                      }));
                    }}
                    onFocus={(e) => e.target.placeholder = ""}
                    onBlur={(e) => e.target.placeholder = "Apuntado en Tarjeta Identificativa"}
                    placeholder="Apuntado en Tarjeta Identificativa"
                    className="min-h-[100px] resize-none placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F]"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="shipmentDocumentation" className="text-sm mb-1">Documentación Envío</Label>
                {isReadOnly ? (
                  <div className="min-h-[100px] p-4 border border-gray-300 rounded-md bg-gray-50">
                    {order.shipmentDocumentation.length > 0 ? (
                      <div className="space-y-1">
                        {order.shipmentDocumentation.map((file, index) => (
                          <div key={index} className="flex items-center bg-white p-1 rounded-md border text-xs">
                            <span className="truncate">{file}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No hay documentación adjunta</div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`mt-1 p-4 border border-dashed rounded-md bg-gray-50 min-h-[100px] relative ${dragActive ? 'border-[#91268F] bg-[#91268F]/5' : ''
                      } flex flex-col h-[100px]`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="fileInput"
                      multiple
                      accept=".pdf,.jpeg,.jpg,.xlsx,.zip"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="fileInput"
                      //codigo cambiado para deshabilitar la subida de archivos
                      // Removemos htmlFor para que no esté asociado al input 
                      className="flex flex-col items-center justify-center cursor-pointer h-full pointer-events-none opacity-50"
                    // Removemos cursor-pointer y agregamos opacity-50 para indicar que no es interactivo
                    >
                      <Upload className="h-4 w-4 text-gray-400" />
                      <p className="text-xs text-gray-600 text-center mt-1">
                        Arrastra y suelta aquí la documentación asociada al envío o{" "}
                        <span className="text-[#91268F]">haga clic para seleccionar</span>
                      </p>
                      <p className="text-[10px] text-gray-500 text-center mt-0.5">
                        Tipos permitidos: .pdf, .jpeg, .xlsx, .zip (máx. 4 archivos, 5 MB cada uno)
                      </p>
                    </label>

                    {order.shipmentDocumentation.length > 0 && (
                      <div className="mt-2 space-y-1 overflow-y-auto">
                        {order.shipmentDocumentation.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white p-1 rounded-md border text-[10px]"
                          >
                            <span className="truncate max-w-[200px]">{file}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* MEJORADO: Sección de comentarios con mejor UI */}
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-[#91268F]" />
                  <Label htmlFor="changeHistory" className="text-sm font-medium">
                    Comentarios del Usuario
                    {manualChangeHistory.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">
                        ({manualChangeHistory.length} {manualChangeHistory.length === 1 ? 'comentario' : 'comentarios'})
                      </span>
                    )}
                  </Label>
                </div>
                <div className="border rounded-md bg-gray-50 overflow-hidden">
                  <div className="max-h-[200px] overflow-y-auto">
                    {manualChangeHistory.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {manualChangeHistory.map((item, i) => (
                          <div key={i} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-[#91268F] rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {item.user || 'Usuario desconocido'}
                                  </span>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDateToDDMMYYYY(item.date)}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-800 bg-gray-100 rounded-lg p-3 border-l-4 border-l-[#91268F]">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-4 text-center">
                        <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p>No hay comentarios registrados</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Use el botón "Agregar Comentario" para añadir observaciones
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  // Removemos onClick
                  className="text-[#91268F] border-[#91268F] h-10 px-4 text-sm mt-7 flex items-center gap-2 opacity-50 cursor-not-allowed"
                // Removemos hover states y agregamos cursor-not-allowed
                //onClick={() => setIsCommentOpen(true)}
                //className="text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white h-10 px-4 text-sm mt-7 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="h-4 w-4" />
                  Agregar Comentario
                </Button>
              )}
            </div>

            {/* MEJORADO: Modal de comentarios con mejor diseño */}
            {isCommentOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="h-5 w-5 text-[#91268F]" />
                    <h3 className="text-lg font-medium">Agregar Comentario</h3>
                  </div>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escriba su comentario aquí..."
                    className="min-h-[100px] resize-none border-[#4C4C4C] focus:border-[#91268F]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCommentOpen(false);
                        setNewComment("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="bg-[#91268F] hover:bg-[#7A1F79] text-white flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-medium ${errors.orderLines && !isReadOnly ? 'text-red-500' : ''}`}>
                  Líneas de Pedido
                  {errors.orderLines && !isReadOnly && (
                    <span className="text-red-500 text-sm ml-2 font-normal">
                      * Debe añadirse al menos una línea de pedido
                    </span>
                  )}
                </h2>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOrderLine}
                    className="text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Añadir Línea
                  </Button>
                )}
              </div>

              <Card className={`border-gray-200 ${errors.orderLines && !isReadOnly ? 'border-red-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-[2fr,3fr,1fr,2fr,auto] gap-4 mb-2">
                    <Label className="text-sm font-medium"><span className="text-red-500">*</span> Matrícula 89</Label>
                    <Label className="text-sm font-medium">Descripción Pieza</Label>
                    <Label className="text-sm font-medium"><span className="text-red-500">*</span> Cant.</Label>
                    <Label className="text-sm font-medium">Num. Serie</Label>
                    <div className="w-[72px]">
                      <span></span>
                    </div>
                  </div>

                  {order.orderLines.map(line => (
                    <div key={line.id} className="grid grid-cols-[2fr,3fr,1fr,2fr,auto] gap-4 items-center mb-2">
                      {isReadOnly ? (
                        <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm flex items-center">
                          {line.registration}
                        </div>
                      ) : (
                        <MaterialAutocompleteInput
                          ref={(ref) => {
                            if (ref) {
                              materialInputRefs.current.set(line.id, ref);
                            } else {
                              materialInputRefs.current.delete(line.id);
                            }
                          }}
                          value={String(line.registration)}
                          onChange={(registration, description) =>
                            handleMaterialRegistrationChange(line.id, registration, description)
                          }
                          onMaterialNotFound={(registration) => handleMaterialNotFound(registration, line.id)}
                          placeholder="89xxxxxx"
                          className={errors.orderLines && !String(line.registration).trim() ? 'border-red-500' : ''}
                          error={errors.orderLines && !String(line.registration).trim()}
                        />
                      )}

                      {isReadOnly ? (
                        <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm flex items-center">
                          {line.partDescription}
                        </div>
                      ) : (
                        <Input
                          name="partDescription"
                          value={line.partDescription}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            handleOrderLineUpdate(line.id, { partDescription: value });
                          }}
                          placeholder="Descripción Pieza"
                          className="h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F] bg-gray-100"
                          readOnly
                        />
                      )}

                      {isReadOnly ? (
                        <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm flex items-center">
                          {line.quantity}
                        </div>
                      ) : (
                        <Input
                          name="quantity"
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            handleOrderLineUpdate(line.id, { quantity: isNaN(value) || value < 1 ? 1 : value });
                          }}
                          placeholder="1"
                          className="h-9 border-[#4C4C4C] focus:border-[#91268F]"
                        />
                      )}

                      {isReadOnly ? (
                        <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm flex items-center">
                          {line.serialNumber}
                        </div>
                      ) : (
                        <Input
                          name="serialNumber"
                          value={line.serialNumber}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            handleOrderLineUpdate(line.id, { serialNumber: value });
                          }}
                          placeholder="ST/3145874"
                          className="h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F]"
                        />
                      )}

                      <div className="flex space-x-1">
                        {!isReadOnly && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="p-0 h-8 w-8"
                            >
                              <Check className="h-4 w-4" />
                            </Button>

                            {order.orderLines.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="p-0 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleOrderLineDelete(line.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
                disabled={loading}
              >
                {loading && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {initialIsEditing ? "Actualizar Pedido" : "Guardar Pedido"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MaterialNotFoundModal
        open={materialNotFoundModal.open}
        registration={materialNotFoundModal.registration}
        onClose={() => setMaterialNotFoundModal({ open: false, registration: "", lineId: "" })}
        onCreateMaterial={handleCreateMaterial}
        onCancel={handleMaterialNotFoundCancel}
      />

      {/* Confirmation Modal for unsaved changes */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Has realizado cambios en este pedido. ¿Qué deseas hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardChanges}>
              Descartar Cambios
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateOrder}
              className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
            >
              Actualizar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}