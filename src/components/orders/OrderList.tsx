import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Order } from "@/types";
import OrderDetails from "./OrderDetails";
import OrderForm from "./OrderForm";
import { warehouses, getOrders, deleteOrder } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Search } from "lucide-react";
import { format } from "date-fns";
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
import { 
  Table, 
  TableBody,
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";

export default function OrderList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const loadedOrders = await getOrders();
        if (Array.isArray(loadedOrders) && loadedOrders.length > 0) {
          const sortedOrders = [...loadedOrders].sort((a, b) => {
            const seqA = parseInt(a.orderNumber.split('/')[2] || '0');
            const seqB = parseInt(b.orderNumber.split('/')[2] || '0');
            return seqB - seqA;
          });
          setOrders(sortedOrders);
          setFilteredOrders(sortedOrders);
        } else {
          setOrders([]);
          setFilteredOrders([]);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los pedidos. Por favor, inténtelo de nuevo.",
        });
      }
    };

    fetchOrders();
  }, [toast]);

  const generateNextOrderNumber = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const defaultWarehouse = warehouses[0].code.replace('ALM', '');
    
    // Find the highest sequential number for the current year
    const currentYearOrders = orders.filter(order => 
      order.orderNumber.includes(`/${currentYear}/`)
    );
    
    let maxSequential = 1000; // Start at 1000 so first number will be 1001
    
    if (currentYearOrders.length > 0) {
      const sequentials = currentYearOrders.map(order => {
        const parts = order.orderNumber.split('/');
        return parseInt(parts[2] || '0');
      });
      maxSequential = Math.max(...sequentials);
    }
    
    return `${defaultWarehouse}/${currentYear}/${(maxSequential + 1).toString().padStart(4, '0')}`;
  };

  const createEmptyOrder = (): Order => {
    const nextOrderNumber = generateNextOrderNumber();
    return {
      id: uuidv4(),
      orderNumber: nextOrderNumber,
      warehouse: "ALM141", // Default warehouse
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
  };

  const handleNewOrder = () => {
    const emptyOrder = createEmptyOrder();
    setSelectedOrder(emptyOrder);
    setIsEditing(false); // This is a NEW order, not editing
    setShowForm(true);
    setShowDetails(false);
  };

  useEffect(() => {
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';
    
    if (searchQuery) {
      const filtered = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(searchQuery) ||
        order.supplierName.toLowerCase().includes(searchQuery) ||
        order.vehicle.toLowerCase().includes(searchQuery)
      ).sort((a, b) => {
        const seqA = parseInt(a.orderNumber.split('/')[2] || '0');
        const seqB = parseInt(b.orderNumber.split('/')[2] || '0');
        return seqB - seqA;
      });
      setFilteredOrders(filtered);
      setCurrentPage(1);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchParams, orders]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value) {
      const filtered = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(value.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(value.toLowerCase()) ||
        order.vehicle.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOrders(filtered);
      setCurrentPage(1);
    } else {
      setFilteredOrders(orders);
    }
  };

  const clearFilter = () => {
    setSearchQuery("");
    setFilteredOrders(orders);
    // Mantener el foco en el campo de búsqueda
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setOrderToDelete(null);
    try {
      await deleteOrder(orderId);
      const updatedOrders = await getOrders();
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders.filter(order => order.id !== orderId));
      toast({
        title: "Pedido eliminado",
        description: "El pedido se ha eliminado correctamente",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el pedido. Por favor, inténtelo de nuevo.",
      });
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetails(true);
    setShowForm(false);
    setIsEditing(false);
  };

  const handleEditOrder = () => {
    if (selectedOrder) {
      setIsEditing(true); // This is EDITING an existing order
      setShowDetails(false);
      setShowForm(true);
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedOrder(null);
    setIsEditing(false);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedOrder(null);
    setIsEditing(false);
  };

  const handleSaveOrder = async () => {
    // Order saved successfully
    const action = isEditing ? "actualizado" : "creado";
    toast({
      title: `Pedido ${action}`,
      description: `El pedido se ha ${action} correctamente`,
    });
    
    // Close form and refresh data
    setShowForm(false);
    setSelectedOrder(null);
    setIsEditing(false);
    
    // Refresh the orders list
    try {
      const updatedOrders = await getOrders();
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders);
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Gestión de Pedidos</h1>
        <Button 
          onClick={handleNewOrder}
          className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Pedido
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por núm. pedido, proveedor, vehículo..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10 h-9"
          />
        </div>
        <Button 
          variant="outline" 
          className="h-9 hover:bg-gray-50 transition-colors duration-200" 
          onClick={clearFilter}
        >
          Borrar Filtro
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium w-[15%]">Núm. Pedido</TableHead>
              <TableHead className="font-medium w-[10%]">Almacén</TableHead>
              <TableHead className="font-medium w-[55%]">Proveedor</TableHead>
              <TableHead className="font-medium w-[10%]">Vehículo</TableHead>
              <TableHead className="font-medium w-[10%]">Fecha Envío</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentOrders.length > 0 ? (
              currentOrders.map((order) => (
                <TableRow 
                  key={order.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  onClick={() => handleViewDetails(order)}
                >
                  <TableCell className="font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center rounded-md border bg-gray-50 px-2 py-1 text-xs">
                      {order.warehouse}
                    </span>
                  </TableCell>
                  <TableCell>{order.supplierName}</TableCell>
                  <TableCell>{order.vehicle}</TableCell>
                  <TableCell>
                    {order.shipmentDate ? format(new Date(order.shipmentDate), 'dd/MM/yyyy') : '--'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  {searchQuery
                    ? "No se encontraron pedidos que coincidan con la búsqueda"
                    : "No hay pedidos registrados. Haga clic en 'Nuevo Pedido' para agregar uno."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
      
      {selectedOrder && showDetails && (
        <OrderDetails
          order={selectedOrder}
          open={showDetails}
          onClose={handleCloseDetails}
          onEdit={handleEditOrder}
          onDelete={() => setOrderToDelete(selectedOrder.id)}
        />
      )}

      {selectedOrder && showForm && (
        <OrderForm
          order={selectedOrder}
          open={showForm}
          onClose={handleCloseForm}
          onSave={handleSaveOrder}
          isEditing={isEditing}
        />
      )}
      
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              ¿Está seguro que desea eliminar este pedido?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-200 text-gray-800 hover:bg-gray-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}