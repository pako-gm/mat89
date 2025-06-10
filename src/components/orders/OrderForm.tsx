import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Order, OrderLine } from "@/types";
import { warehouses, getSuppliers, saveOrder } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { hasAnyRole } from "@/lib/auth";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Upload, PlusCircle, Trash2, Check } from "lucide-react";
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
  isEditing
}: OrderFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [suppliers, setSuppliers] = useState<{id: string; name: string}[]>([]);
  const [errors, setErrors] = useState({
    supplier: false,
    vehicle: false,
    dismantleDate: false,
    shipmentDate: false,
    orderLines: false
  });
  const [authError, setAuthError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>({
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
  });

  useEffect(() => {
    const loadSuppliers = async () => {
      const data = await getSuppliers();
      setSuppliers(data);
    };
    loadSuppliers();
    
    // Check authentication on component mount
    checkUserAuthentication();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "warehouse") {
      // Update order number when warehouse changes
      const warehouseNum = value.replace('ALM', '');
      const sequential = order.orderNumber.split('/')[2] || '1001';
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
      }
      return;
    }
    
    setOrder(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setOrder(prev => ({
      ...prev,
      warranty: checked,
      nonConformityReport: checked ? prev.nonConformityReport : "" // Clear NC report when warranty is disabled
    }));
  };

  const handleOrderLineUpdate = (id: string, data: Partial<OrderLine>) => {
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

  const handleOrderLineDelete = (id: string) => {
    setOrder(prev => ({
      ...prev,
      orderLines: prev.orderLines.filter(line => line.id !== id)
    }));
  };

  const addOrderLine = () => {
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

  const handleAddComment = () => {
    if (newComment.trim()) {
      setOrder(prev => ({
        ...prev,
        changeHistory: [
          ...prev.changeHistory,
          {
            id: uuidv4(),
            date: new Date().toISOString(),
            user: "usuario@mat89.com",
            description: newComment.trim()
          }
        ]
      }));
      setNewComment("");
      setIsCommentOpen(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
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
    setOrder(prev => ({
      ...prev,
      shipmentDocumentation: prev.shipmentDocumentation.filter(f => f !== fileName)
    }));
  };

  const validateForm = () => {
    // Check if there's at least one order line with a registration
    const hasValidOrderLine = order.orderLines.some(line => line.registration.trim() !== "");
    
    const newErrors = {
      supplier: !order.supplierId,
      vehicle: !order.vehicle,
      dismantleDate: !order.dismantleDate,
      shipmentDate: !order.shipmentDate,
      orderLines: !hasValidOrderLine
    };
    
    setErrors(newErrors);
    
    return !Object.values(newErrors).some(Boolean);
  };

  const checkUserAuthentication = async () => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Authentication error:", error);
        setAuthError("Error de autenticación: " + error.message);
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: error.message,
        });
        return false;
      }
      
      if (!data.user || !data.user.id) {
        setAuthError("No se ha podido verificar su sesión. Por favor, inicie sesión nuevamente.");
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "No se ha podido verificar su sesión. Por favor, inicie sesión nuevamente.",
        });
        return false;
      }
      
      // Verificar permisos del usuario según su rol
      const hasPermission = await hasAnyRole(['ADMINISTRADOR', 'EDICION']);
      
      if (!hasPermission) {
        setAuthError("No tiene permisos suficientes para realizar esta acción.");
        toast({
          variant: "destructive",
          title: "Error de permisos",
          description: "Su rol actual no le permite editar o crear pedidos.",
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking authentication:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setAuthError("Error al verificar la autenticación: " + errorMessage);
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: "No se ha podido verificar su sesión. Por favor, inicie sesión nuevamente.",
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check specific error for order lines first
    if (!order.orderLines.some(line => line.registration.trim() !== "")) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "Debe añadirse al menos una línea de pedido",
      });
      
      setErrors(prev => ({
        ...prev,
        orderLines: true
      }));
      return;
    }
    
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
      
      if (!isEditing) {
        const now = new Date();
        updatedOrder = {
          ...updatedOrder,
          changeHistory: [
            ...updatedOrder.changeHistory,
            {
              id: uuidv4(),
              date: now.toISOString(),
              user: "usuario@mat89.com",
              description: `Creación pedido`
            }
          ]
        };
      } else {
        // Add update comment
        const now = new Date();
        updatedOrder = {
          ...updatedOrder,
          changeHistory: [
            ...updatedOrder.changeHistory,
            {
              id: uuidv4(),
              date: now.toISOString(),
              user: "usuario@mat89.com",
              description: `Actualización de pedido`
            }
          ]
        };
      }
      
      await saveOrder(updatedOrder);
      toast({
        title: isEditing ? "Pedido actualizado" : "Pedido creado",
        description: isEditing 
          ? "El pedido se ha actualizado correctamente" 
          : "El pedido se ha creado correctamente",
      });
      onSave();
    } catch (error) {
      console.error("Error saving order:", error);
      let errorMessage = "No se pudo guardar el pedido. Por favor, inténtelo de nuevo.";
      
      if (error instanceof Error) {
        // Use the specific error message if available
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Pedido" : "Nuevo Pedido"}
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="orderNumber" className="text-sm mb-1">Num. Pedido</Label>
              <Input
                id="orderNumber"
                name="orderNumber"
                value={order.orderNumber}
                readOnly
                placeholder={`${order.warehouse.replace('ALM', '')}/25/1001`}
                className="h-9 border-[#4C4C4C] bg-gray-100 cursor-not-allowed text-[#4C4C4C]"
              />
            </div>

            <div>
              <Label htmlFor="supplier" className="text-sm mb-1">
                <span className="text-red-500">*</span> Razón Social
                {errors.supplier && (
                  <span className="text-red-500 text-xs ml-2">Campo requerido</span>
                )}
              </Label>
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
            </div>

            <div>
              <Label htmlFor="warehouse" className="text-sm mb-1">Almacen</Label>
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
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="vehicle" className="text-sm mb-1">
                <span className="text-red-500">*</span> Vehículo
                {errors.vehicle && (
                  <span className="text-red-500 text-xs ml-2">Campo requerido</span>
                )}
              </Label>
              <Input
                id="vehicle"
                name="vehicle"
                value={order.vehicle.replace(/[^\d-]/g, '')}
                onChange={(e) => {
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
            </div>
            
            <div className="flex items-center justify-end space-x-2 pt-6">
              <Label htmlFor="warranty" className="text-sm">Garantía</Label>
              <Switch
                defaultChecked={false}
                id="warranty"
                checked={order.warranty}
                onCheckedChange={handleSwitchChange}
              />
            </div>
            
            <div>
              <Label htmlFor="nonConformityReport" className="text-sm mb-1">Informe No Conformidad</Label>
              <Input
                disabled={!order.warranty}
                id="nonConformityReport"
                name="nonConformityReport"
                value={order.nonConformityReport.toUpperCase()}
                onChange={(e) => {
                  if (order.warranty) {
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dismantleDate" className="text-sm mb-1">
                * Fecha Desmonte
                {errors.dismantleDate && (
                  <span className="text-red-500 text-xs ml-2">
                    {order.shipmentDate && order.dismantleDate > order.shipmentDate 
                      ? "Debe ser anterior a la fecha de envío" 
                      : "Campo requerido"}
                  </span>
                )}
              </Label>
              <Input
                id="dismantleDate"
                name="dismantleDate"
                type="date"
                max={order.shipmentDate || undefined}
                value={order.dismantleDate}
                onChange={handleChange}
                className={`h-9 border-[#4C4C4C] focus:border-[#91268F] text-[#4C4C4C] ${errors.dismantleDate ? 'border-red-500' : ''}`}
              />
            </div>
            
            <div>
              <Label htmlFor="shipmentDate" className="text-sm mb-1">
                * Fecha Envío
                {errors.shipmentDate && (
                  <span className="text-red-500 text-xs ml-2">
                    {order.dismantleDate && order.shipmentDate < order.dismantleDate
                      ? "Debe ser posterior a la fecha de desmonte"
                      : "Campo requerido"}
                  </span>
                )}
              </Label>
              <Input
                id="shipmentDate"
                name="shipmentDate"
                type="date"
                min={order.dismantleDate || undefined}
                value={order.shipmentDate}
                onChange={handleChange}
                className={`h-9 border-[#4C4C4C] focus:border-[#91268F] text-[#4C4C4C] ${errors.shipmentDate ? 'border-red-500' : ''}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="declaredDamage" className="text-sm mb-1">Avería Declarada</Label>
              <Textarea
                id="declaredDamage"
                name="declaredDamage"
                value={order.declaredDamage.toUpperCase()}
                onChange={(e) => {
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
            </div>
            
            <div>
              <Label htmlFor="shipmentDocumentation" className="text-sm mb-1">Documentación Envío</Label>
              <div
                className={`mt-1 p-4 border border-dashed rounded-md bg-gray-50 min-h-[100px] relative ${
                  dragActive ? 'border-[#91268F] bg-[#91268F]/5' : ''
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
                  className="flex flex-col items-center justify-center cursor-pointer h-full"
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
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <Label htmlFor="changeHistory" className="text-sm mb-1">Histórico de Cambios</Label>
              <div className="mt-1 border rounded-md h-[100px] overflow-y-auto bg-gray-50 p-2">
                {order.changeHistory.length > 0 ? (
                  order.changeHistory.map((item, i) => (
                    <div key={i} className="text-xs py-1">
                      <span className="font-medium">{new Date(item.date).toLocaleString()}</span> - 
                      <span className="text-gray-600 ml-1">{item.description}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-2">
                    No hay cambios registrados
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCommentOpen(true)}
              className="text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white h-8 px-3 text-sm mt-7"
            >
              Insertar Comentario
            </Button>
          </div>
          
          {isCommentOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">Insertar Comentario</h3>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escriba su comentario aquí..."
                  className="min-h-[100px] resize-none border-[#4C4C4C] focus:border-[#91268F]"
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCommentOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddComment}
                    className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-medium ${errors.orderLines ? 'text-red-500' : ''}`}>
                Líneas de Pedido
                {errors.orderLines && (
                  <span className="text-red-500 text-sm ml-2 font-normal">
                    * Debe añadirse al menos una línea de pedido
                  </span>
                )}
              </h2>
              <Button 
                type="button"
                variant="outline" 
                onClick={addOrderLine}
                className="text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white"
              >
                <PlusCircle className="h-4 w-4 mr-1" /> Añadir Línea
              </Button>
            </div>
            
            <Card className={`border-gray-200 ${errors.orderLines ? 'border-red-500' : ''}`}>
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
                    <Input
                      name="registration"
                      value={line.registration}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d]/g, '');
                        // Only allow more digits if empty, starts with 89, or is still typing the first two digits
                        if (value.length <= 2 || value.startsWith('89')) {
                          value = value.slice(0, 8);
                        } else {
                          value = value.slice(0, 2);
                        }
                        handleOrderLineUpdate(line.id, { registration: value });
                      }}
                      placeholder="89654014"
                      className={`h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F] ${
                        errors.orderLines && !line.registration.trim() ? 'border-red-500' : ''
                      }`}
                    />
                    
                    <Input
                      name="partDescription"
                      value={line.partDescription}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleOrderLineUpdate(line.id, { partDescription: value });
                      }}
                      placeholder="Descripción Pieza"
                      className="h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F]"
                    />
                    
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
                    
                    <div className="flex space-x-1">
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
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
              disabled={loading || !!authError}
            >
              {loading && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {isEditing ? "Actualizar Pedido" : "Guardar Pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}