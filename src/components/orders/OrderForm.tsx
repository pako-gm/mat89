import { useState, useEffect, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { Order, OrderLine, Warehouse, WarrantyHistoryInfo } from "@/types";
import { getSuppliers, saveOrder, DuplicateMaterialInfo, getUserWarehouses, checkWarrantyStatus } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { hasAnyRole } from "@/lib/auth";
import {
  filterManualChangeHistory,
  formatDateToDDMMYYYY,
  formatCommentTimestamp,
  savePausedOrder,
  getPausedOrder,
  clearPausedOrder,
  hasPausedOrder
} from "@/lib/utils";
import MaterialNotFoundModal from "./MaterialNotFoundModal";
import MaterialAutocompleteInput, { MaterialAutocompleteInputRef } from "./MaterialAutocompleteInput";
import WarrantyConfirmationModal from "./WarrantyConfirmationModal";
import WarrantyHistoryModal from "./WarrantyHistoryModal";
import NCRequiredModal from "./NCRequiredModal";
import {
  Dialog,
  DialogContent,
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
import { PlusCircle, Trash2, Check, MessageCircle, Send, Info } from "lucide-react";
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
import { GuardarDocumentacionPedido } from "./GuardarDocumentacionPedido";

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
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const MAX_COMMENT_LENGTH = 1000;
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; isExternal: boolean }[]>([]);
  const [isExternalSupplier, setIsExternalSupplier] = useState(false);
  const [availableWarehouses, setAvailableWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [canChangeWarehouse, setCanChangeWarehouse] = useState(true);
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
    orderLines: false,
    nonConformityReport: false,
    declaredDamage: false,
    serialNumber: false
  });
  // const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Warranty detection state
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showNCModal, setShowNCModal] = useState(false);
  const [duplicateMaterials] = useState<DuplicateMaterialInfo[]>([]);
  const [pendingSave, setPendingSave] = useState(false);
  const [warrantyLocked, setWarrantyLocked] = useState(false);
  const [showWarrantyInfoModal, setShowWarrantyInfoModal] = useState(false);

  // NEW: Warranty history modal states
  const [showWarrantyHistoryModal, setShowWarrantyHistoryModal] = useState(false);
  const [warrantyHistory, setWarrantyHistory] = useState<WarrantyHistoryInfo[]>([]);
  const [canProceedWithWarranty, setCanProceedWithWarranty] = useState(true);

  // Ref to prevent multiple executions of warranty decline
  const isProcessingWarrantyDecline = useRef(false);

  // Referencias para los inputs de matrícula
  const materialInputRefs = useRef<Map<string, MaterialAutocompleteInputRef>>(new Map());

  // Referencias para los inputs de cantidad
  const quantityInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Initialize order state with proper defaults
  const [order, setOrder] = useState<Order>(() => {
    return {
      id: initialOrder.id || uuidv4(),
      orderNumber: initialOrder.orderNumber || "",
      warehouse: initialOrder.warehouse || "",
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
      // Verificar si hay un pedido pausado que restaurar
      const pausedOrder = getPausedOrder();

      let newOrder: Order;

      if (pausedOrder && !initialIsEditing) {
        // Recuperar el pedido pausado
        console.log('[OrderForm] Recuperando pedido pausado');
        newOrder = pausedOrder.orderData;

        // Mostrar notificación al usuario
        toast({
          title: "Pedido recuperado",
          description: "Se ha restaurado el pedido que estaba en proceso.",
          duration: 3000,
        });
      } else {
        // Crear nuevo pedido o editar existente (flujo normal)
        newOrder = {
          id: initialOrder.id || uuidv4(),
          orderNumber: initialOrder.orderNumber || "",
          warehouse: initialOrder.warehouse || "",
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
      }

      setOrder(newOrder);
      setHasChanges(false);

      // Clear errors when opening
      setErrors({
        supplier: false,
        vehicle: false,
        dismantleDate: false,
        shipmentDate: false,
        orderLines: false,
        nonConformityReport: false,
        declaredDamage: false,
        serialNumber: false
      });

      // Clear authentication errors
      setAuthError(null);

      // Lock warranty switch if order has warranty and NC already filled
      // This preserves the lock when re-opening existing orders
      if (initialOrder.warranty && initialOrder.nonConformityReport && initialOrder.nonConformityReport.trim() !== "") {
        setWarrantyLocked(true);
      } else {
        setWarrantyLocked(false);
      }

      // Reset warranty decline processing flag
      isProcessingWarrantyDecline.current = false;
    }
  }, [open, initialOrder, initialIsEditing, toast]);

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
      setIsInitialLoad(true);
      loadSuppliers();
      //checkUserAuthentication();
      // Disable initial load flag after a short delay to allow initial rendering
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Reset flags when closing
      setHasChanges(false);
      setIsInitialLoad(true);
    }
  }, [open, toast]);

  // Load user warehouses
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        setWarehousesLoading(true);
        const userWarehouses = await getUserWarehouses();
        setAvailableWarehouses(userWarehouses);

        // Si es un nuevo pedido y hay almacenes disponibles, establecer el primero como predeterminado
        if (!initialIsEditing && userWarehouses.length > 0 && !order.warehouse) {
          setOrder(prev => ({
            ...prev,
            warehouse: userWarehouses[0].code
          }));
        }
      } catch (error) {
        console.error('Error loading warehouses:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los almacenes asignados.",
        });
      } finally {
        setWarehousesLoading(false);
      }
    };

    if (open) {
      loadWarehouses();
    }
  }, [open, initialIsEditing, toast]);

  // FASE 5: Check if user can change warehouse (for editing existing orders)
  useEffect(() => {
    const checkWarehouseAccess = () => {
      if (initialIsEditing && order.warehouse && !warehousesLoading) {
        const hasAccess = availableWarehouses.some(w => w.code === order.warehouse);
        setCanChangeWarehouse(hasAccess);
      } else {
        setCanChangeWarehouse(true);
      }
    };

    checkWarehouseAccess();
  }, [initialIsEditing, order.warehouse, availableWarehouses, warehousesLoading]);

  // Update isExternalSupplier when suppliers are loaded and a supplier is selected
  useEffect(() => {
    if (order.supplierId && suppliers.length > 0) {
      const selectedSupplier = suppliers.find(s => s.id === order.supplierId);
      if (selectedSupplier) {
        setIsExternalSupplier(selectedSupplier.isExternal);
      }
    }
  }, [suppliers, order.supplierId]);

  // Mark as changed whenever user modifies something
  const markAsChanged = () => {
    console.log('markAsChanged called, isInitialLoad:', isInitialLoad, 'hasChanges:', hasChanges);
    if (!isInitialLoad && !hasChanges) {
      console.log('Setting hasChanges to true');
      setHasChanges(true);
    }
  };

  // Handle close - simplified without confirmation
  const handleClose = () => {
    onClose();
  };

  // Discard changes and close
  /* COMMENTED OUT - Not currently used
  const handleDiscardChanges = () => {
    setShowConfirmModal(false);
    setHasChanges(false);

    // Si hay un pedido pausado y el usuario descarta los cambios, limpiarlo
    if (hasPausedOrder()) {
      console.log('[OrderForm] Usuario descartó cambios, limpiando pedido pausado');
      clearPausedOrder();
    }

    onClose();
  };
  */

  // Save changes and close
  /* COMMENTED OUT - Not currently used
  const handleUpdateOrder = async () => {
    setShowConfirmModal(false);
    // Create a fake event to pass to handleSubmit
    const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };
  */

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

    //AQUI ES DONDE SE FORMATEA EL NÚMERO DE PEDIDO
    if (name === "orderNumber") {
      // Extract warehouse number from selected warehouse
      const warehouseNum = order.warehouse;
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

  /**
   * Genera el número de pedido para un almacén con numeración GLOBAL
   * El correlativo es compartido entre TODOS los almacenes (no por almacén individual)
   */
  const generateOrderNumberForWarehouse = async (warehouseCode: string): Promise<string> => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const warehouseNum = warehouseCode;

    try {
      // Buscar TODOS los pedidos del año para encontrar el máximo correlativo
      // (compatible con formatos "141/25/1030" y "ALM141/25/1030")
      const { data: yearOrders } = await supabase
        .from('tbl_pedidos_rep')
        .select('num_pedido')
        .like('num_pedido', `%/${currentYear}/%`);

      let maxSequential = 999;

      if (yearOrders && yearOrders.length > 0) {
        // Extraer todos los correlativos y encontrar el máximo
        const sequentials = yearOrders.map(order => {
          const parts = order.num_pedido.split('/');
          return parseInt(parts[2] || '0');
        }).filter(num => !isNaN(num));

        if (sequentials.length > 0) {
          maxSequential = Math.max(...sequentials);
        }
      }

      const nextSequential = (maxSequential + 1).toString().padStart(4, '0');
      return `${warehouseNum}/${currentYear}/${nextSequential}`;
    } catch (error) {
      console.error('Error generating order number:', error);
      // Fallback: usar 1000 como secuencial predeterminado
      return `${warehouseNum}/${currentYear}/1000`;
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (isReadOnly) return;
    markAsChanged();

    if (name === "warehouse") {
      // Update order number when warehouse changes (async to get GLOBAL sequential)
      setOrder(prev => ({
        ...prev,
        warehouse: value
      }));

      // Generar número de pedido GLOBAL de forma asíncrona
      generateOrderNumberForWarehouse(value).then(newOrderNumber => {
        setOrder(prev => ({
          ...prev,
          orderNumber: newOrderNumber
        }));
      });
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

        // Update external supplier flag
        setIsExternalSupplier(selectedSupplier.isExternal);

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

    // Prevent changes if warranty is locked
    if (warrantyLocked) return;

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
    const { registration, lineId } = materialNotFoundModal;

    // Guardar el estado completo del pedido antes de navegar
    savePausedOrder(order, lineId, registration);

    // Cerrar el modal
    setMaterialNotFoundModal({ open: false, registration: "", lineId: "" });

    // Cerrar el formulario de pedido
    onClose();

    // Navegar a materiales con la matrícula prellenada
    navigate('/materiales', {
      state: {
        newMaterial: true,
        registrationPreset: registration,
        fromPausedOrder: true
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

    // Check if supplier is external and already has 1 line
    if (isExternalSupplier && order.orderLines.length >= 1) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "Los proveedores externos solo pueden tener 1 línea de pedido",
      });
      return;
    }

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

  // Función para agregar comentarios
  const handleAddComment = async () => {
    if (isReadOnly) return;

    const trimmedComment = newComment.trim();
    if (!trimmedComment) return;

    try {
      // Obtener el email del usuario actual autenticado
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error('Usuario no autenticado');
      }

      // Crear comentario con timestamp del servidor (formato ISO)
      const newChange = {
        id: uuidv4(),
        date: new Date().toISOString(),
        user: user.email,
        description: sanitizeComment(trimmedComment)
      };

      // Insertar al inicio del array para orden descendente
      setOrder(prev => ({
        ...prev,
        changeHistory: [newChange, ...prev.changeHistory]
      }));

      // Cerrar modal y limpiar estado
      setIsCommentOpen(false);
      setNewComment("");
      markAsChanged();

      // Mostrar notificación de éxito
      toast({
        title: "Comentario agregado",
        description: "El comentario se ha agregado correctamente.",
      });
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el comentario. Intente nuevamente.",
      });
    }
  };

  // Sanitización de comentarios (escape HTML pero preserva saltos de línea)
  const sanitizeComment = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

  // Función para manejar cierre del modal con confirmación
  const handleCloseCommentModal = () => {
    if (newComment.trim()) {
      setShowCloseConfirmation(true);
    } else {
      setIsCommentOpen(false);
      setNewComment("");
    }
  };

  const confirmCloseCommentModal = () => {
    setShowCloseConfirmation(false);
    setIsCommentOpen(false);
    setNewComment("");
  };

  const validateForm = () => {
    // Check if there's at least one order line with a registration
    const hasValidOrderLine = order.orderLines.some(line => String(line.registration).trim() !== "");

    // Check if there's at least one order line with a serial number when external supplier
    const hasValidSerialNumber = isExternalSupplier
      ? order.orderLines.some(line => String(line.serialNumber).trim() !== "")
      : true;

    const newErrors = {
      supplier: !order.supplierId,
      vehicle: !order.vehicle.trim(),
      dismantleDate: !order.dismantleDate,
      shipmentDate: !order.shipmentDate,
      orderLines: !hasValidOrderLine,
      nonConformityReport: order.warranty && !order.nonConformityReport.trim(),
      declaredDamage: isExternalSupplier && !order.declaredDamage.trim(),
      serialNumber: !hasValidSerialNumber
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

    // PHASE 2: Warranty detection for external suppliers
    // Only check for duplicates if warranty hasn't been processed yet
    // (i.e., warranty is false OR warranty is true but NC is empty - meaning user manually enabled it)
    const warrantyAlreadyProcessed = order.warranty && order.nonConformityReport && order.nonConformityReport.trim() !== "";

    if (isExternalSupplier && !pendingSave && !warrantyAlreadyProcessed) {
      const hasDuplicates = await checkForWarrantyDuplicates();
      if (hasDuplicates) {
        return; // Wait for user response in warranty modal
      }
    }

    // Proceed with save
    await proceedWithSave();
  };

  // Check for duplicate materials in warranty period - NEW IMPLEMENTATION
  const checkForWarrantyDuplicates = async (): Promise<boolean> => {
    try {
      const materials = order.orderLines
        .map(line => parseInt(line.registration))
        .filter(reg => !isNaN(reg));

      if (materials.length === 0) {
        return false;
      }

      console.log('[OrderForm] Checking warranty status for materials:', materials);

      // Use NEW warranty status function
      const warrantyStatusResults = await checkWarrantyStatus(
        materials,
        order.supplierId,
        order.id
      );

      if (warrantyStatusResults.length > 0) {
        console.log('[OrderForm] Warranty history found:', warrantyStatusResults);

        // Check if ALL materials can proceed
        const allCanProceed = warrantyStatusResults.every(ws => ws.canSendWithWarranty);

        setWarrantyHistory(warrantyStatusResults);
        setCanProceedWithWarranty(allCanProceed);
        setShowWarrantyHistoryModal(true);

        return true; // Has history, modal shown
      }

      return false; // No history
    } catch (error) {
      console.error("Error checking warranty status:", error);
      return false;
    }
  };

  // Handle warranty history modal - Continue button
  const handleWarrantyHistoryContinue = () => {
    setShowWarrantyHistoryModal(false);
    // User has reviewed the history and wants to proceed
    // Now show the WarrantyConfirmationModal
    setShowWarrantyModal(true);
  };

  // Handle warranty history modal - Close button
  const handleWarrantyHistoryClose = () => {
    setShowWarrantyHistoryModal(false);
    // User cancelled, reset warranty state
    setWarrantyHistory([]);
    setCanProceedWithWarranty(true);
  };

  // Handle warranty modal acceptance
  const handleWarrantyAccepted = () => {
    setShowWarrantyModal(false);

    // Enable warranty checkbox AND lock it immediately
    setOrder(prev => ({ ...prev, warranty: true }));
    setWarrantyLocked(true);

    // Check if NC field is empty
    if (!order.nonConformityReport || order.nonConformityReport.trim() === "") {
      // Show NC required modal
      setShowNCModal(true);
    } else {
      // NC already filled, proceed with save
      setPendingSave(true);
    }
  };

  // Handle warranty modal decline
  const handleWarrantyDeclined = async () => {
    // Prevent multiple executions
    if (isProcessingWarrantyDecline.current) {
      return;
    }

    isProcessingWarrantyDecline.current = true;
    setShowWarrantyModal(false);

    // Add automatic comment to change history
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Sistema';

    const automaticComment = {
      id: uuidv4(),
      date: new Date().toISOString(),
      user: userEmail,
      description: `Rechazado por el usuario ${userEmail} el envío en garantía de reparación. Envio anterior con PAR nº ${duplicateMaterials.map(m => m.numPedido).join(', ')}`
    };

    setOrder(prev => ({
      ...prev,
      enviadoSinGarantia: true,
      changeHistory: [automaticComment, ...prev.changeHistory]
    }));

    // Proceed with save
    setPendingSave(true);
  };

  // Handle NC modal submission
  const handleNCSubmitted = async (ncNumber: string) => {
    setShowNCModal(false);

    // Add automatic comment to change history
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Sistema';

    const automaticComment = {
      id: uuidv4(),
      date: new Date().toISOString(),
      user: userEmail,
      description: `El usuario ${userEmail} ha aceptado la garantía de reparación`,
      isAutomatic: true
    };

    // Update order with NC number and add automatic comment
    setOrder(prev => ({
      ...prev,
      nonConformityReport: ncNumber,
      changeHistory: [automaticComment, ...prev.changeHistory]
    }));

    // Lock warranty switch to prevent user from unchecking it
    setWarrantyLocked(true);

    // Show informative modal instead of saving immediately
    setShowWarrantyInfoModal(true);
  };

  // Handle NC not opened - delete order and close
  const handleNCNotOpened = async () => {
    setShowNCModal(false);
    setShowWarrantyModal(false);
    setShowWarrantyInfoModal(false);

    // If order exists in database, delete it
    if (order.id && initialIsEditing) {
      try {
        const { error } = await supabase
          .from('tbl_pedidos_rep')
          .delete()
          .eq('id', order.id);

        if (error) {
          console.error('Error deleting order:', error);
          toast({
            variant: "destructive",
            title: "Error al borrar",
            description: "No se pudo borrar el pedido. Por favor, inténtelo de nuevo.",
          });
          return;
        }

        toast({
          title: "Pedido borrado",
          description: "El pedido ha sido eliminado. Créalo nuevamente cuando dispongas del número de NC.",
          duration: 5000,
        });

        // Refresh parent list
        onSave();
      } catch (error) {
        console.error('Error deleting order:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ocurrió un error al intentar borrar el pedido.",
        });
        return;
      }
    } else {
      // New order - just close modal
      toast({
        title: "Proceso cancelado",
        description: "Graba nuevamente el pedido cuando dispongas del número de No Conformidad.",
        duration: 5000,
      });
    }

    // Close order modal
    onClose();
  };

  // Trigger save when pendingSave changes to true
  useEffect(() => {
    if (pendingSave) {
      proceedWithSave();
      setPendingSave(false);
    }
  }, [pendingSave]);

  // Proceed with saving the order
  const proceedWithSave = async () => {
    setLoading(true);

    try {
      const updatedOrder = {
        ...order,
        // Ensure all order lines have valid quantities before saving
        orderLines: order.orderLines.map(line => ({
          ...line,
          quantity: typeof line.quantity === 'number' && line.quantity > 0 ? line.quantity : 1
        }))
      };

      console.log('=== GUARDANDO PEDIDO ===');
      console.log('ChangeHistory antes de guardar:', updatedOrder.changeHistory);
      console.log('Número de líneas de pedido:', updatedOrder.orderLines.length);
      console.log('Líneas de pedido:', updatedOrder.orderLines);
      console.log('Número original:', updatedOrder.orderNumber);

      // Capturar resultado del guardado
      const saveResult = await saveOrder(updatedOrder);

      // Verificar si el número fue regenerado
      if (saveResult._numberWasRegenerated) {
        const newNumber = saveResult._finalOrderNumber;
        console.log('🔄 Número regenerado automáticamente:', newNumber);

        toast({
          title: "Número de pedido actualizado",
          description: `El numero de PAR ha cambiado a ${newNumber}, porque el anterior ya fue utilizado por otro usuario.`,
          duration: 5000,
        });

        // Actualizar estado local con el nuevo número
        setOrder(prev => ({
          ...prev,
          orderNumber: newNumber
        }));
      }

      console.log('=== PEDIDO GUARDADO EXITOSAMENTE ===');

      // Limpiar el estado pausado si existe
      if (hasPausedOrder()) {
        console.log('[OrderForm] Limpiando pedido pausado tras guardar exitosamente');
        clearPausedOrder();
      }

      // Wait 3 seconds before closing the modal
      setTimeout(() => {
        onSave();
      }, 3000);

    } catch (error) {
      console.error("Error saving order:", error);
      let errorMessage = "No se pudo guardar el pedido. Por favor, inténtelo de nuevo.";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Mensaje específico para duplicados
        if (error.message.includes('número de pedido') ||
            error.message.includes('duplicate') ||
            error.message.includes('tomado por otro usuario')) {
          errorMessage = error.message +
            "\n\nIntente guardar nuevamente. El sistema generará un nuevo número automáticamente.";
        }
      }

      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
      // Reset warranty decline processing flag after save completes
      isProcessingWarrantyDecline.current = false;
    }
  };

  // Filtrar solo comentarios manuales para mostrar en el histórico
  const manualChangeHistory = useMemo(() => {
    return filterManualChangeHistory(order.changeHistory);
  }, [order.changeHistory]);

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
                {isReadOnly ? (
                  renderReadOnlyInput(order.orderNumber, `${order.warehouse}/25/1001`)
                ) : (
                  <Input
                    id="orderNumber"
                    name="orderNumber"
                    value={order.orderNumber}
                    readOnly
                    placeholder={`${order.warehouse}/25/1001`}
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
                <Label htmlFor="warehouse" className="text-sm mb-1">
                  Almacén
                  {!canChangeWarehouse && initialIsEditing && (
                    <span className="text-xs text-gray-500 ml-2">(Solo lectura)</span>
                  )}
                </Label>
                {isReadOnly ? (
                  renderReadOnlySelect(order.warehouse, availableWarehouses, (w) => w.code)
                ) : (
                  <Select
                    value={order.warehouse}
                    onValueChange={(value) => handleSelectChange("warehouse", value)}
                    disabled={warehousesLoading || availableWarehouses.length === 0 || !canChangeWarehouse}
                  >
                    <SelectTrigger className="h-9 border-[#4C4C4C]">
                      <SelectValue placeholder={warehousesLoading ? "Cargando..." : "Selecciona almacén"} />
                    </SelectTrigger>
                    <SelectContent>
                      {canChangeWarehouse ? (
                        availableWarehouses.map(warehouse => (
                          <SelectItem key={warehouse.id} value={warehouse.code}>
                            ALM{warehouse.code} - {warehouse.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={order.warehouse} disabled>
                          ALM{order.warehouse} (Sin permisos)
                        </SelectItem>
                      )}
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
                    disabled={warrantyLocked}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="nonConformityReport" className="text-sm mb-1">
                  Informe No Conformidad
                  {errors.nonConformityReport && <span className="text-red-500 ml-1">*</span>}
                </Label>
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
                        // Clear error when user types
                        if (errors.nonConformityReport) {
                          setErrors(prev => ({ ...prev, nonConformityReport: false }));
                        }
                      }
                    }}
                    onFocus={(e) => e.target.placeholder = ""}
                    onBlur={(e) => e.target.placeholder = "Informe NC"}
                    placeholder="Informe NC"
                    className={`h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F] text-[#4C4C4C] ${!order.warranty ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors.nonConformityReport ? 'border-red-500 focus:border-red-500' : ''}`}
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

            <div className="grid grid-cols-2 gap-4 items-start">
              <div>
                <Label htmlFor="declaredDamage" className={`text-sm mb-1 block ${errors.declaredDamage ? 'text-red-500' : ''}`}>
                  {isExternalSupplier && <span className="text-red-500">* </span>}
                  Avería Declarada
                  {errors.declaredDamage && (
                    <span className="text-red-500 text-xs ml-2 font-normal">
                      * Campo obligatorio para proveedores externos
                    </span>
                  )}
                </Label>
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
                      // Clear error when user starts typing
                      if (errors.declaredDamage && value.trim()) {
                        setErrors(prev => ({ ...prev, declaredDamage: false }));
                      }
                    }}
                    onFocus={(e) => e.target.placeholder = ""}
                    onBlur={(e) => e.target.placeholder = "Apuntado en Tarjeta Identificativa"}
                    placeholder="Apuntado en Tarjeta Identificativa"
                    className={`min-h-[100px] resize-none placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F] ${errors.declaredDamage ? 'border-red-500' : ''}`}
                  />
                )}
              </div>

              <div>
                {/* <Label className="text-sm mb-1 block">Documentación Envío</Label> */}
                {order.id && <GuardarDocumentacionPedido pedidoId={order.id} />}
                {!order.id && (
                  <div className="p-4 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-500">
                    Guarde el pedido primero para poder adjuntar documentación
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
                          <div key={i} className="p-3 bg-white hover:bg-gray-50 transition-colors">
                            <div className="text-sm text-gray-800">
                              <span className="italic text-gray-600">
                                {formatCommentTimestamp(item.date)} - {item.user || 'Usuario desconocido'}
                              </span>
                              <span className="mx-2">-</span>
                              <span
                                className="whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{
                                  __html: item.description.replace(/\n/g, '<br>')
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-4 text-center">
                        <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p>No hay comentarios registrados</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Use el botón "Agregar Comentario" para añadir observaciones (numero RMA, numero contrato Serv. Ext., detalles del envío, etc.)
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
                  onClick={() => setIsCommentOpen(true)}
                  className="text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white h-10 px-4 text-sm mt-7 flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Agregar Comentario
                </Button>
              )}
            </div>

            {/* Modal de comentarios */}
            {isCommentOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) {
                    handleCloseCommentModal();
                  }
                }}
              >
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="h-5 w-5 text-[#91268F]" />
                    <h3 className="text-lg font-medium">Agregar Comentario</h3>
                  </div>
                  <Textarea
                    value={newComment}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= MAX_COMMENT_LENGTH) {
                        setNewComment(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCloseCommentModal();
                      }
                    }}
                    placeholder="Escribe tu comentario sobre el pedido..."
                    className="min-h-[120px] resize-none border-[#4C4C4C] focus:border-[#91268F]"
                    autoFocus
                  />
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>
                      {newComment.length}/{MAX_COMMENT_LENGTH} caracteres
                    </span>
                    {newComment.length >= MAX_COMMENT_LENGTH && (
                      <span className="text-red-500">Límite alcanzado</span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCloseCommentModal();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddComment();
                      }}
                      disabled={!newComment.trim()}
                      className="bg-[#91268F] hover:bg-[#7A1F79] text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                      Guardar Comentario
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de confirmación al cerrar */}
            <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Descartar comentario</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tienes texto sin guardar. ¿Estás seguro de que deseas cerrar sin guardar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setShowCloseConfirmation(false)}>
                    Continuar editando
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmCloseCommentModal}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Descartar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
                    disabled={isExternalSupplier && order.orderLines.length >= 1}
                    className="text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#91268F]"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Añadir Línea
                  </Button>
                )}
              </div>

              <Card className={`border-gray-200 ${errors.orderLines && !isReadOnly ? 'border-red-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-[2fr,3fr,1fr,2fr,auto] gap-4 mb-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm font-medium"><span className="text-red-500">*</span> Matrícula 89</Label>
                      <div className="group relative inline-block">
                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                          La descripción se completará automáticamente al ingresar los 8 dígitos de la matrícula
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </div>
                    <Label className="text-sm font-medium">Descripción Pieza</Label>
                    <Label className="text-sm font-medium"><span className="text-red-500">*</span> Cant.</Label>
                    <Label className={`text-sm font-medium ${errors.serialNumber && !isReadOnly ? 'text-red-500' : ''}`}>
                      {isExternalSupplier && <span className="text-red-500">* </span>}
                      Num. Serie
                      {errors.serialNumber && !isReadOnly && (
                        <span className="text-red-500 text-xs ml-2 font-normal block">
                          * Campo obligatorio para proveedores externos
                        </span>
                      )}
                    </Label>
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
                          onSelectionComplete={() => {
                            const quantityInput = quantityInputRefs.current.get(line.id);
                            if (quantityInput) {
                              setTimeout(() => quantityInput.focus(), 0);
                            }
                          }}
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
                          ref={(el) => {
                            if (el) {
                              quantityInputRefs.current.set(line.id, el);
                            } else {
                              quantityInputRefs.current.delete(line.id);
                            }
                          }}
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
                            // Clear error when user starts typing
                            if (errors.serialNumber && value.trim()) {
                              setErrors(prev => ({ ...prev, serialNumber: false }));
                            }
                          }}
                          placeholder="ST/3145874"
                          className={`h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F] ${errors.serialNumber && isExternalSupplier && !String(line.serialNumber).trim() ? 'border-red-500' : ''}`}
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

      {/* Warranty History Modal - Shows BEFORE confirmation */}
      <WarrantyHistoryModal
        open={showWarrantyHistoryModal}
        onClose={handleWarrantyHistoryClose}
        onContinue={canProceedWithWarranty ? handleWarrantyHistoryContinue : undefined}
        historyData={warrantyHistory}
        canProceed={canProceedWithWarranty}
        blockingReason={
          warrantyHistory.find(wh => !wh.canSendWithWarranty)?.blockingReason || null
        }
      />

      {/* Warranty Confirmation Modal */}
      <WarrantyConfirmationModal
        open={showWarrantyModal}
        duplicateMaterials={duplicateMaterials}
        onAccept={handleWarrantyAccepted}
        onDecline={handleWarrantyDeclined}
      />

      {/* NC Required Modal */}
      <NCRequiredModal
        open={showNCModal}
        currentNCValue={order.nonConformityReport}
        onSubmit={handleNCSubmitted}
        onNotOpened={handleNCNotOpened}
      />

      {/* Warranty Info Modal - Reminder about documentation */}
      <Dialog open={showWarrantyInfoModal} onOpenChange={setShowWarrantyInfoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Enviado en Garantia
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base leading-relaxed text-gray-700">
              El pedido se ha marcado como enviado en garantía, no te olvides
              de subir el documento de la No Conformidad en <strong>Documentos Adjuntos</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowWarrantyInfoModal(false);
                setPendingSave(true);
              }}
              className="w-full bg-[#91268F] hover:bg-[#7A1F79] text-white"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}