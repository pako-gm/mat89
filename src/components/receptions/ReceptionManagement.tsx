import { useState, useEffect } from "react";
import { Order, OrderLine, MaterialReception } from "@/types";
import { formatDateToDDMMYYYY } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  getOrdersForReception,
  getReceptionsByLineId,
  saveReception,
  deleteReception,
  updateOrderStatusIfComplete,
  getUserWarehouses,
  getAllWarehouses
} from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronDown, ChevronUp, Plus, Trash2, Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import WarrantyReceptionModal from "./WarrantyReceptionModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { v4 as uuidv4 } from "uuid";

export default function ReceptionManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceptionDialog, setShowReceptionDialog] = useState(false);
  const [selectedLine, setSelectedLine] = useState<OrderLine | null>(null);
  const [lineReceptions, setLineReceptions] = useState<MaterialReception[]>([]);
  const [newReception, setNewReception] = useState<Partial<MaterialReception>>({
    fechaRecepcion: new Date().toISOString().split('T')[0],
    estadoRecepcion: undefined,
    nRec: 1,
    nsRec: '',
    observaciones: '',
    almRecepciona: undefined
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [receptionToDelete, setReceptionToDelete] = useState<MaterialReception | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Warranty reception state
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [pendingReception, setPendingReception] = useState<MaterialReception | null>(null);

  // FASE 5: Warehouse reception state
  const [allWarehouses, setAllWarehouses] = useState<Array<{id: string; code: string; name: string}>>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  const receptionStates = [
    { value: 'UTIL', label: 'ÚTIL' },
    { value: 'IRREPARABLE', label: 'IRREPARABLE' },
    { value: 'SIN ACTUACION', label: 'SIN ACTUACIÓN' },
    { value: 'OTROS', label: 'OTROS' }
  ];

  // Initialize form to default state
  const initializeForm = (line?: OrderLine) => {
    const currentLine = line || selectedLine;
    setNewReception({
      fechaRecepcion: new Date().toISOString().split('T')[0],
      estadoRecepcion: undefined,
      nRec: 1,
      nsRec: currentLine?.serialNumber || '',
      observaciones: '',
      // FASE 5: Default almRecepciona to the warehouse that sent the order
      almRecepciona: selectedOrder?.warehouse || undefined
    });
    setFormErrors({});
  };

  useEffect(() => {
    fetchOrders();
    fetchUserRoleAndWarehouses();
  }, []);

  const fetchUserRoleAndWarehouses = async () => {
    try {
      // Fetch user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        setUserRole(profile?.role || null);
      }

      // Fetch all warehouses for dropdown
      const warehouses = await getAllWarehouses();
      setAllWarehouses(warehouses);
    } catch (error) {
      console.error('Error fetching user role and warehouses:', error);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const filtered = orders.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrders(filtered);
      setCurrentPage(1); // Reset to first page when filtering
    } else {
      setFilteredOrders(orders);
    }
  }, [searchQuery, orders]);

  const fetchOrders = async () => {
    try {
      // FASE 4: Obtener almacenes del usuario para filtrar recepciones
      const userWarehouses = await getUserWarehouses();
      const warehouseCodes = userWarehouses.map(w => w.code);

      if (warehouseCodes.length === 0) {
        console.warn('User has no warehouses assigned, showing no orders for reception');
        setOrders([]);
        setFilteredOrders([]);
        return;
      }

      const data = await getOrdersForReception();

      // Filtrar pedidos por almacenes del usuario
      const filteredByWarehouse = data.filter(order =>
        warehouseCodes.includes(order.warehouse)
      );

      setOrders(filteredByWarehouse);
      setFilteredOrders(filteredByWarehouse);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los pedidos.",
      });
    }
  };

  const handleOrderClick = (order: Order) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(order.id);
    }
  };

  const handleReceptionClick = async (order: Order, line: OrderLine) => {
    setSelectedOrder(order);
    setSelectedLine(line);
    
    try {
      const receptions = await getReceptionsByLineId(line.id);
      setLineReceptions(receptions);
      setShowReceptionDialog(true);
      // Initialize form when dialog opens
      initializeForm(line);
    } catch (error) {
      console.error('Error fetching receptions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las recepciones.",
      });
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    // Validate fecha_recepcion
    if (!newReception.fechaRecepcion) {
      errors.fechaRecepcion = "La fecha de recepción es obligatoria";
    } else if (selectedOrder) {
      // Validate that reception date is equal or greater than shipment date
      const receptionDate = new Date(newReception.fechaRecepcion);
      const shipmentDate = new Date(selectedOrder.shipmentDate);

      if (receptionDate < shipmentDate) {
        errors.fechaRecepcion = "La fecha de recepción debe ser igual o posterior a la fecha de envío";
      }
    }

    // FASE 5: Validate almRecepciona
    if (!newReception.almRecepciona) {
      errors.almRecepciona = "El almacén de recepción es obligatorio";
    }

    // Validate nRec first
    if (!newReception.nRec || newReception.nRec <= 0) {
      errors.nRec = "La cantidad recibida es obligatoria y debe ser mayor a 0";
    }

    // Conditional validation for estadoRecepcion
    // Only required when the line is being completed or over-completed
    if (selectedLine && newReception.nRec) {
      const currentTotalReceived = lineReceptions.reduce((sum, r) => sum + r.nRec, 0);
      const totalReceivedAfterThis = currentTotalReceived + newReception.nRec;
      
      // If this reception completes or over-completes the line, estado is required
      if (totalReceivedAfterThis >= selectedLine.quantity) {
        if (!newReception.estadoRecepcion) {
          errors.estadoRecepcion = "El estado de recepción es obligatorio cuando se completa la línea";
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddReception = async () => {
    if (!selectedLine || !selectedOrder) return;

    // Validate form first
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "Por favor, completa todos los campos obligatorios.",
      });
      return;
    }

    // Validation: Check if total received would exceed total sent
    const currentTotalReceived = lineReceptions.reduce((sum, r) => sum + r.nRec, 0);
    const newTotalReceived = currentTotalReceived + (newReception.nRec || 0);

    if (newTotalReceived > selectedLine.quantity) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: `La cantidad total recibida (${newTotalReceived}) no puede exceder la cantidad enviada (${selectedLine.quantity}).`,
      });
      return;
    }

    // Create the reception object
    const reception: MaterialReception = {
      id: uuidv4(),
      pedidoId: selectedOrder.id,
      lineaPedidoId: selectedLine.id,
      fechaRecepcion: newReception.fechaRecepcion || new Date().toISOString().split('T')[0],
      estadoRecepcion: newReception.estadoRecepcion as any,
      nRec: newReception.nRec || 1,
      nsRec: newReception.nsRec || '',
      observaciones: newReception.observaciones || '',
      almRecepciona: newReception.almRecepciona || selectedOrder.warehouse
    };

    // PHASE 3: Check if this reception completes a warranty order
    const willComplete = newTotalReceived >= selectedLine.quantity;
    if (willComplete && selectedOrder.warranty) {
      // Store pending reception and show warranty modal
      setPendingReception(reception);
      setShowWarrantyModal(true);
      return; // Wait for warranty modal response
    }

    // No warranty check needed, proceed with save
    await proceedWithSaveReception(reception);
  };

  // Handle warranty modal confirmation
  const handleWarrantyConfirm = async (acceptedByProvider: boolean, rejectionReason?: string) => {
    setShowWarrantyModal(false);

    if (!pendingReception) return;

    // Add warranty fields to reception
    const receptionWithWarranty: MaterialReception = {
      ...pendingReception,
      garantiaAceptadaProveedor: acceptedByProvider,
      motivoRechazoGarantia: acceptedByProvider ? null : rejectionReason
    };

    await proceedWithSaveReception(receptionWithWarranty);
    setPendingReception(null);
  };

  // Handle warranty modal cancellation
  const handleWarrantyCancel = () => {
    setShowWarrantyModal(false);
    setPendingReception(null);

    toast({
      title: "Recepción cancelada",
      description: "La recepción no se ha guardado. Complete la información de garantía para continuar.",
    });
  };

  // Proceed with saving reception
  const proceedWithSaveReception = async (reception: MaterialReception) => {
    if (!selectedLine || !selectedOrder) return;

    setLoading(true);
    try {
      await saveReception(reception);

      // Refresh receptions for the dialog
      const updatedReceptions = await getReceptionsByLineId(selectedLine.id);
      setLineReceptions(updatedReceptions);

      // Reset form to initial state
      initializeForm();

      // CRITICAL: Update order status after adding reception
      await updateOrderStatusIfComplete(selectedOrder.id);

      // CRITICAL: Refresh orders to update totalReceived and status
      await fetchOrders();

      // Update the selectedLine totalReceived immediately for dialog display
      const newTotalReceived = updatedReceptions.reduce((sum, r) => sum + r.nRec, 0);
      if (selectedLine) {
        setSelectedLine({
          ...selectedLine,
          totalReceived: newTotalReceived
        });
      }

      toast({
        title: "Recepción agregada",
        description: "La recepción ha sido registrada correctamente.",
      });
    } catch (error) {
      console.error('Error saving reception:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la recepción.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReception = async () => {
    if (!receptionToDelete) return;

    try {
      await deleteReception(receptionToDelete.id);

      // Refresh receptions for the dialog
      if (selectedLine) {
        const updatedReceptions = await getReceptionsByLineId(selectedLine.id);
        setLineReceptions(updatedReceptions);
        
        // Update the selectedLine totalReceived immediately for dialog display
        const newTotalReceived = updatedReceptions.reduce((sum, r) => sum + r.nRec, 0);
        setSelectedLine({
          ...selectedLine,
          totalReceived: newTotalReceived
        });
      }
      
      // CRITICAL: Update order status after deleting reception
      if (selectedOrder) {
        await updateOrderStatusIfComplete(selectedOrder.id);
      }

      // Refresh orders to update quantities and status - CRITICAL  
      await fetchOrders();
      
      toast({
        title: "Recepción eliminada",
        description: "La recepción ha sido eliminada correctamente.",
      });
    } catch (error) {
      console.error('Error deleting reception:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la recepción.",
      });
    } finally {
      setReceptionToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETADO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTotalReceived = (line: OrderLine) => {
    // Usar el total calculado desde la base de datos si está disponible
    const dbTotal = line.totalReceived || 0;
    console.log(`[DEBUG] getTotalReceived for line ${line.id}: ${dbTotal}`);
    return dbTotal;
  };

  // Check if we can add more receptions to this line
  const canAddMoreReceptions = () => {
    if (!selectedLine) return false;
    const totalReceived = lineReceptions.reduce((sum, r) => sum + r.nRec, 0);
    return totalReceived < selectedLine.quantity;
  };

  // Calculate remaining quantity that can be received
  const getRemainingQuantity = () => {
    if (!selectedLine) return 0;
    const totalReceived = getTotalReceived(selectedLine);
    return Math.max(0, selectedLine.quantity - totalReceived);
  };

  const handleInputChange = (field: string, value: any) => {
    // Handle special case for estadoRecepcion select
    if (field === 'estadoRecepcion' && value === '__NONE__') {
      setNewReception(prev => ({ ...prev, [field]: undefined }));
    } else if (field === 'nRec') {
      // Ensure nRec doesn't exceed remaining quantity
      const remainingQuantity = getRemainingQuantity();
      const adjustedValue = Math.min(Math.max(1, value), remainingQuantity);
      setNewReception(prev => ({ ...prev, [field]: adjustedValue }));
    } else {
      setNewReception(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const clearFilter = () => {
    setSearchQuery('');
    setFilteredOrders(orders);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Get the most recent reception date for an order
  const getMostRecentReceptionDate = (order: Order): string | null => {
    let mostRecentDate: Date | null = null;

    // Iterate through all order lines
    for (const line of order.orderLines) {
      if (line.receptions && line.receptions.length > 0) {
        // Find the most recent reception date in this line
        for (const reception of line.receptions) {
          const receptionDate = new Date(reception.fechaRecepcion);
          if (!mostRecentDate || receptionDate > mostRecentDate) {
            mostRecentDate = receptionDate;
          }
        }
      }
    }

    return mostRecentDate ? mostRecentDate.toISOString().split('T')[0] : null;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Recepción de Materiales</h1>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por num. Pedido, Proveedor, Almacen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Button variant="outline" className="h-9" onClick={clearFilter}>
          Borrar Filtro
        </Button>
      </div>

      <div className="rounded-md border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium">Num. Pedido</TableHead>
              <TableHead className="font-medium">Razón Social</TableHead>
              <TableHead className="font-medium">Alm. Envía</TableHead>
              <TableHead className="font-medium">F. Envío</TableHead>
              <TableHead className="font-medium">F. Recepción</TableHead>
              <TableHead className="font-medium">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentOrders.map((order) => (
              <>
                <TableRow
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleOrderClick(order)}
                >
                  <TableCell className="flex items-center gap-2">
                    {expandedOrderId === order.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                    <span
                      className={`font-bold ${
                        order.warranty &&
                        !order.enviadoSinGarantia &&
                        order.estadoPedido === 'COMPLETADO'
                          ? 'text-[#EF4444]'
                          : ''
                      }`}
                    >
                      {order.orderNumber}
                    </span>
                  </TableCell>
                  <TableCell>{order.supplierName}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center rounded-md border bg-gray-50 px-2 py-1 text-xs">
                      {order.warehouse}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDateToDDMMYYYY(order.shipmentDate)}
                  </TableCell>
                  <TableCell>
                    {getMostRecentReceptionDate(order)
                      ? formatDateToDDMMYYYY(getMostRecentReceptionDate(order)!)
                      : '***'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs ${getStatusColor(
                        order.estadoPedido || 'PENDIENTE'
                      )}`}
                    >
                      {order.estadoPedido || 'PENDIENTE'}
                    </span>
                  </TableCell>
                </TableRow>
                {expandedOrderId === order.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0 border-b">
                      <div className="bg-gray-50 p-4">
                        <div className="grid grid-cols-[2fr,3fr,1fr,1fr,2fr,1.5fr,1fr] gap-4 py-2 text-sm font-medium text-gray-600 items-center border-b border-gray-200">
                          <div>Matrícula 89</div>
                          <div>Descripción Pieza</div>
                          <div>Cant. Env.</div>
                          <div>Cant. Rec.</div>
                          <div>Num. Serie</div>
                          <div>F. Recepción</div>
                          <div>Acciones</div>
                        </div>
                        {order.orderLines.map((line) => (
                          <div
                            key={line.id}
                            className="grid grid-cols-[2fr,3fr,1fr,1fr,2fr,1.5fr,1fr] gap-4 py-2 text-sm border-t border-gray-200 hover:bg-gray-100 items-center"
                          >
                            <div className="flex items-center gap-2">
                              {getTotalReceived(line) >= line.quantity && (
                                <Package className="h-4 w-4 text-green-600" />
                              )}
                              {line.registration}
                            </div>
                            <div>{line.partDescription}</div>
                            <div>{line.quantity}</div>
                            <div className={`font-medium ${getTotalReceived(line) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {getTotalReceived(line)}
                            </div>
                            <div>{line.serialNumber}</div>
                            <div>{line.lastReceptionDate ? formatDateToDDMMYYYY(line.lastReceptionDate) : '**'}</div>
                            <div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReceptionClick(order, line);
                                }}
                                className={getTotalReceived(line) >= line.quantity
                                  ? "text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                                  : "text-[#91268F] border-[#91268F] hover:bg-[#91268F] hover:text-white"}
                              >
                                {getTotalReceived(line) >= line.quantity ? 'Consultar' : 'Recepcionar'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredOrders.length > ordersPerPage && (
        <div className="flex justify-center items-center py-4 mt-4">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => paginate(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="mx-2 flex items-center text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => paginate(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Reception Dialog */}
      <Dialog open={showReceptionDialog} onOpenChange={setShowReceptionDialog}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestión de Recepciones - {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLine && (
            <div className="space-y-6">
              {/* Line Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Información de la Línea</h3>
                <div className="grid grid-cols-2 grid-rows-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Matrícula:</span> {selectedLine.registration}
                  </div>
                  <div>
                    <span className="font-medium">Cantidad Enviada:</span> {selectedLine.quantity}
                  </div>
                  <div>
                    <span className="font-medium">Descripción:</span> {selectedLine.partDescription}
                  </div>
                  <div>
                    <span className="font-medium">Total Recibido:</span> {getTotalReceived(selectedLine)}
                  </div>
                </div>
              </div>

              {/* Warranty Information - Only show if this is a warranty order and has warranty reception data */}
              {selectedOrder?.warranty && lineReceptions.some(r => r.garantiaAceptadaProveedor !== null && r.garantiaAceptadaProveedor !== undefined) && (
                <div className={`p-4 rounded-lg border ${
                  lineReceptions.find(r => r.garantiaAceptadaProveedor !== null && r.garantiaAceptadaProveedor !== undefined)?.garantiaAceptadaProveedor
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`font-medium mb-2 ${
                    lineReceptions.find(r => r.garantiaAceptadaProveedor !== null && r.garantiaAceptadaProveedor !== undefined)?.garantiaAceptadaProveedor
                      ? 'text-[#107C41]'
                      : 'text-red-600'
                  }`}>
                    {lineReceptions.find(r => r.garantiaAceptadaProveedor !== null && r.garantiaAceptadaProveedor !== undefined)?.garantiaAceptadaProveedor
                      ? 'Aceptada Garantía de Reparación'
                      : 'Rechazada Garantía de Reparación'}
                  </h3>
                  {lineReceptions.find(r => r.motivoRechazoGarantia)?.motivoRechazoGarantia && (
                    <div className="text-sm mt-2">
                      <span className="font-medium">Motivo del rechazo:</span>{' '}
                      <span className="text-gray-700">
                        {lineReceptions.find(r => r.motivoRechazoGarantia)?.motivoRechazoGarantia}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Add Reception Form */}
              {canAddMoreReceptions() ? (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Nueva Recepción</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fechaRecepcion">
                        Fecha Recepción <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fechaRecepcion"
                        type="date"
                        value={newReception.fechaRecepcion}
                        onChange={(e) => handleInputChange('fechaRecepcion', e.target.value)}
                        className={`h-9 ${formErrors.fechaRecepcion ? 'border-red-500' : ''}`}
                      />
                      {formErrors.fechaRecepcion && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.fechaRecepcion}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="almRecepciona">
                        Almacén Recepciona <span className="text-red-500">*</span>
                        {userRole !== 'admin' && ' (Solo lectura)'}
                      </Label>
                      <Select
                        value={newReception.almRecepciona || '__NONE__'}
                        onValueChange={(value) => handleInputChange('almRecepciona', value)}
                        disabled={userRole !== 'admin'}
                      >
                        <SelectTrigger className={`h-9 ${formErrors.almRecepciona ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Selecciona almacén" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NONE__">Selecciona almacén</SelectItem>
                          {allWarehouses.map(warehouse => (
                            <SelectItem key={warehouse.id} value={warehouse.code}>
                              ALM{warehouse.code} - {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.almRecepciona && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.almRecepciona}</p>
                      )}
                      {userRole !== 'admin' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Solo administradores pueden cambiar el almacén de recepción
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="estadoRecepcion">
                        Estado Recepción <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={newReception.estadoRecepcion || '__NONE__'}
                        onValueChange={(value) => handleInputChange('estadoRecepcion', value)}
                      >
                        <SelectTrigger className={`h-9 ${formErrors.estadoRecepcion ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Elige un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NONE__">Elige un estado</SelectItem>
                          {receptionStates.map(state => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.estadoRecepcion && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.estadoRecepcion}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="nRec">
                        Cantidad Recibida <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="nRec"
                        type="number"
                        min="1"
                        max={getRemainingQuantity()}
                        value={newReception.nRec}
                        onChange={(e) => handleInputChange('nRec', parseInt(e.target.value) || 1)}
                        className={`h-9 ${formErrors.nRec ? 'border-red-500' : ''}`}
                      />
                      {formErrors.nRec && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.nRec}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo disponible: {getRemainingQuantity()}
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="nsRec">Número de Serie</Label>
                      <Input
                        id="nsRec"
                        value={newReception.nsRec}
                        onChange={(e) => handleInputChange('nsRec', e.target.value)}
                        className="h-9"
                        placeholder="Número de serie"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="observaciones">Observaciones</Label>
                      <Textarea
                        id="observaciones"
                        value={newReception.observaciones}
                        onChange={(e) => handleInputChange('observaciones', e.target.value)}
                        className="min-h-[80px]"
                        placeholder="Observaciones adicionales..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleAddReception}
                      disabled={loading || !canAddMoreReceptions()}
                      className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
                    >
                      {loading ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Recepción
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium mb-2 text-gray-700">Recepción Completada</h3>
                  <p className="text-sm text-gray-600">
                    La cantidad total recibida ({getTotalReceived(selectedLine)}) ha alcanzado la cantidad total enviada ({selectedLine.quantity}). 
                    No se pueden agregar más recepciones para esta línea de pedido.
                  </p>
                </div>
              )}

              {/* Receptions List */}
              {lineReceptions.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Recepciones Registradas</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Almacén</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Nº Serie</TableHead>
                          <TableHead>Observaciones</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineReceptions.map((reception) => (
                          <TableRow key={reception.id}>
                            <TableCell>
                              {formatDateToDDMMYYYY(reception.fechaRecepcion)}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {reception.almRecepciona
                                  ? `ALM${reception.almRecepciona}`
                                  : selectedOrder?.warehouse
                                    ? `ALM${selectedOrder.warehouse}`
                                    : '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                reception.estadoRecepcion === 'UTIL' ? 'bg-green-100 text-green-800' :
                                reception.estadoRecepcion === 'IRREPARABLE' ? 'bg-red-100 text-red-800' :
                                reception.estadoRecepcion === 'SIN ACTUACION' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {reception.estadoRecepcion}
                              </span>
                            </TableCell>
                            <TableCell>{reception.nRec}</TableCell>
                            <TableCell>{reception.nsRec}</TableCell>
                            <TableCell>{reception.observaciones}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReceptionToDelete(reception)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceptionDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!receptionToDelete} onOpenChange={() => setReceptionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar esta recepción? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteReception}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warranty Reception Modal */}
      <WarrantyReceptionModal
        open={showWarrantyModal}
        onConfirm={handleWarrantyConfirm}
        onCancel={handleWarrantyCancel}
      />
    </div>
  );
}