import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Order } from "@/types";
import OrderDetails from "./OrderDetails";
import OrderForm from "./OrderForm";
import { warehouses, getOrders, deleteOrder } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Search, Star, Trash2, FileDown } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { generateInternalSupplierExcel } from "@/lib/excelGenerator";
import { saveAs } from "file-saver";

export default function OrderList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  
  // Lanzar PAR modal state
  const [showLanzarParModal, setShowLanzarParModal] = useState(false);
  const [orderNumberInput, setOrderNumberInput] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");
  
  // PAR generation modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [generatedHTML, setGeneratedHTML] = useState("");

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
    const defaultWarehouseCode = warehouses[0].code;
    const warehouseNumber = defaultWarehouseCode.replace('ALM', '');
    
    const currentYearOrders = orders.filter(order => order.orderNumber.includes(`/${currentYear}/`));
    
    let maxSequential = 1000; 
    
    if (currentYearOrders.length > 0) {
      const sequentials = currentYearOrders.map(order => {
        const parts = order.orderNumber.split('/');
        return parseInt(parts[2] || '0');
      });
      maxSequential = Math.max(...sequentials);
    }
    
    return `${warehouseNumber}/${currentYear}/${(maxSequential + 1).toString().padStart(4, '0')}`;
  };

  const createEmptyOrder = (): Order => {
    const nextOrderNumber = generateNextOrderNumber();
    return {
      id: uuidv4(),
      orderNumber: nextOrderNumber,
      warehouse: warehouses[0].code,
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
    setIsEditing(false);
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
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const confirmDeleteOrder = (orderId: string) => {
    setOrderToDelete(orderId);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteOrder = async () => {
    setShowDeleteConfirmation(false);
    try {
      if (!orderToDelete) return;
      await deleteOrder(orderToDelete);
      const updatedOrders = await getOrders();
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders.filter(order => order.id !== orderToDelete)); // Corrected this line
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
    setOrderToDelete(null);
  };

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
    setShowDetails(false);
    setShowForm(false);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleEditOrder = () => {
    if (selectedOrder) {
      setIsEditing(true);
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
    const action = isEditing ? "actualizado" : "creado";
    toast({
      title: `Pedido ${action}`,
      description: `El pedido se ha ${action} correctamente`,
    });
    
    setShowForm(false);
    setSelectedOrder(null);
    setIsEditing(false);
    
    try {
      const updatedOrders = await getOrders();
      setOrders(updatedOrders);
      setFilteredOrders(updatedOrders);
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  };

  const handleLanzarPAR = () => {
    setShowLanzarParModal(true);
    setOrderNumberInput("");
  };

  const handleLanzarParCancel = () => {
    setShowLanzarParModal(false);
    setOrderNumberInput("");
  };

  const handleLanzarParAccept = async () => {
    if (!orderNumberInput.trim()) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor, introduce las últimas 4 cifras del pedido.",
      });
      return;
    }

    if (orderNumberInput.length !== 4) {
      toast({
        variant: "destructive",
        title: "Formato incorrecto",
        description: "Debes introducir exactamente 4 dígitos.",
      });
      return;
    }

    try {
      // Buscar el pedido por las 4 últimas cifras
      const orderFound = await findOrderByLastDigits(orderNumberInput);
      
      if (!orderFound) {
        toast({
          variant: "destructive",
          title: "Pedido no encontrado",
          description: `No se encontró ningún pedido que termine en: ${orderNumberInput}`,
        });
        return;
      }

      // Obtener información del proveedor
      const supplier = await getSupplierInfo(orderFound.proveedor_id);
      
      if (!supplier) {
        toast({
          variant: "destructive",
          title: "Error de datos",
          description: "No se pudo obtener la información del proveedor.",
        });
        return;
      }

      // Lógica condicional basada en es_externo
      if (supplier.es_externo === true) {
        // Llamar a función para proveedores externos
        await procesarProveedorExterno(orderFound.num_pedido);
      } else {
        // Llamar a función para proveedores internos
        await procesarProveedorInterno(orderFound.num_pedido);
      }
      
    } catch (error) {
      console.error('Error processing PAR:', error);
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo conectar con la base de datos. Inténtelo de nuevo.",
      });
    }
    
    setShowLanzarParModal(false);
    setOrderNumberInput("");
  };

  // Función para buscar pedido por las 4 últimas cifras
  const findOrderByLastDigits = async (lastDigits: string) => {
    try {
      const { data: orders, error } = await supabase
        .from('tbl_pedidos_rep')
        .select('id, num_pedido, proveedor_id')
        .ilike('num_pedido', `%${lastDigits}`);

      if (error) {
        console.error('Database error:', error);
        return null;
      }

      // Filtrar pedidos que realmente terminen con esas cifras
      const matchingOrders = orders?.filter(order => 
        order.num_pedido.slice(-4) === lastDigits
      );

      if (!matchingOrders || matchingOrders.length === 0) {
        return null;
      }

      if (matchingOrders.length > 1) {
        toast({
          variant: "destructive",
          title: "Múltiples pedidos encontrados",
          description: `Se encontraron ${matchingOrders.length} pedidos que terminan en ${lastDigits}. Use un número más específico.`,
        });
        return null;
      }

      return matchingOrders[0];
    } catch (error) {
      console.error('Error searching order:', error);
      throw error;
    }
  };

  // Función para obtener información del proveedor
  const getSupplierInfo = async (supplierId: string) => {
    try {
      const { data: supplier, error } = await supabase
        .from('tbl_proveedores')
        .select('id, nombre, es_externo, direccion, ciudad, provincia, codigo_postal, email')
        .eq('id', supplierId)
        .single();

      if (error) {
        console.error('Supplier query error:', error);
        return null;
      }

      return supplier;
    } catch (error) {
      console.error('Error getting supplier info:', error);
      throw error;
    }
  };

  // Función para procesar proveedores externos
  // Función para procesar proveedores externos - MODIFICADA
const procesarProveedorExterno = async (numeroPedido: string) => {
  try {
    // Obtener datos completos del pedido
    const orderData = await fetchCompleteOrderData(numeroPedido);
    if (!orderData) {
      throw new Error('No se pudieron obtener los datos del pedido');
    }

    // Generar HTML directamente con formato A4 vertical
    const documentHTML = generateProveedorExternoHTML(orderData);
    
    setGeneratedHTML(documentHTML);
    setShowPrintModal(true);
    
    toast({
      title: "Documento generado",
      description: "El documento PAR se ha generado correctamente.",
    });
    
  } catch (error) {
    console.error('Error processing external supplier PAR:', error);
    toast({
      variant: "destructive",
      title: "Error al generar documento",
      description: error instanceof Error ? error.message : "Error desconocido al procesar el PAR",
    });
  }
};

// Nueva función para generar HTML con formato A4 vertical
const generateProveedorExternoHTML = (orderData: any) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatDateTime = () => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const proveedor = orderData.tbl_proveedores || {};
  const lineasPedido = orderData.tbl_ln_pedidos_rep || [];

  // Generar filas de las líneas de pedido en formato grid
  const generarLineasPedidoHTML = () => {
    if (!lineasPedido || lineasPedido.length === 0) {
      return `
        <div class="grid-item no-data">
          <p>No hay líneas de pedido disponibles</p>
        </div>
      `;
    }

    return lineasPedido.map((linea, index) => `
      <div class="grid-item">
        <div class="line-header">
          <span class="line-number">Línea ${index + 1}</span>
        </div>
        <div class="line-content">
          <div class="field-group">
            <label>Matrícula:</label>
            <span>${linea.registration || 'N/A'}</span>
          </div>
          <div class="field-group">
            <label>Descripción de la pieza:</label>
            <span>${linea.partDescription || 'N/A'}</span>
          </div>
          <div class="field-row">
            <div class="field-group">
              <label>Cantidad:</label>
              <span>${linea.quantity || '0'}</span>
            </div>
            <div class="field-group">
              <label>Número de serie:</label>
              <span>${linea.serialNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pedido de Repuestos PAR - ${orderData.num_pedido}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        @page {
            size: A4 portrait;
            margin: 20mm;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 20mm;
                font-size: 12px;
            }
            .no-print {
                display: none;
            }
            .page-break {
                page-break-before: always;
            }
        }
        
        .document-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 20px;
            min-height: 297mm;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #0066cc;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            width: 200px;
            height: 60px;
            background: linear-gradient(45deg, #ff0000, #cc0000);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
            border-radius: 5px;
            position: relative;
        }
        
        .logo::after {
            content: 'RENFE';
            position: absolute;
            font-size: 20px;
        }
        
        .document-info {
            text-align: right;
            flex: 1;
        }
        
        .document-title {
            font-size: 24px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }
        
        .document-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .generation-date {
            font-size: 12px;
            color: #888;
        }
        
        .main-content {
            display: grid;
            gap: 25px;
        }
        
        .section {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-weight: 600;
            color: #495057;
            font-size: 13px;
            margin-bottom: 5px;
        }
        
        .info-value {
            padding: 8px 12px;
            background: white;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
            min-height: 36px;
            display: flex;
            align-items: center;
        }
        
        .supplier-section .info-grid {
            grid-template-columns: 2fr 1fr 1fr;
        }
        
        .lines-section {
            margin-top: 10px;
        }
        
        .lines-grid {
            display: grid;
            gap: 15px;
            margin-top: 15px;
        }
        
        .grid-item {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            overflow: hidden;
        }
        
        .line-header {
            background: #0066cc;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .line-content {
            padding: 15px;
        }
        
        .field-group {
            margin-bottom: 12px;
        }
        
        .field-group label {
            display: block;
            font-weight: 600;
            color: #495057;
            font-size: 12px;
            margin-bottom: 4px;
        }
        
        .field-group span {
            display: block;
            padding: 6px 10px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 3px;
            font-size: 13px;
            min-height: 32px;
            line-height: 20px;
        }
        
        .field-row {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 15px;
        }
        
        .warranty-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .warranty-yes {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .warranty-no {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .no-data {
            padding: 40px 20px;
            text-align: center;
            color: #6c757d;
            font-style: italic;
            background: white;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                text-align: center;
            }
            
            .document-info {
                text-align: center;
                margin-top: 20px;
            }
            
            .info-grid,
            .supplier-section .info-grid {
                grid-template-columns: 1fr;
            }
            
            .field-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="document-container">
        <header class="header">
            <div class="logo-section">
                <div class="logo"></div>
            </div>
            <div class="document-info">
                <div class="document-title">PEDIDO DE REPUESTOS</div>
                <div class="document-subtitle">Proveedor Externo</div>
                <div class="generation-date">Generado el ${formatDateTime()}</div>
            </div>
        </header>
        
        <main class="main-content">
            <!-- Información del Pedido -->
            <section class="section">
                <h2 class="section-title">Información del Pedido</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Número de Pedido</span>
                        <div class="info-value">${orderData.num_pedido || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Fecha de Envío</span>
                        <div class="info-value">${formatDate(orderData.fecha_envio)}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Vehículo</span>
                        <div class="info-value">${orderData.vehiculo || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Garantía</span>
                        <div class="info-value">
                            <span class="warranty-badge ${orderData.garantia ? 'warranty-yes' : 'warranty-no'}">
                                ${orderData.garantia ? 'SÍ' : 'NO'}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-label">Avería Declarada</span>
                    <div class="info-value">${orderData.averia_declarada || 'No especificada'}</div>
                </div>
            </section>
            
            <!-- Información del Proveedor -->
            <section class="section supplier-section">
                <h2 class="section-title">Información del Proveedor</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Nombre de la Empresa</span>
                        <div class="info-value">${proveedor.nombre || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Ciudad</span>
                        <div class="info-value">${proveedor.ciudad || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Provincia</span>
                        <div class="info-value">${proveedor.provincia || 'N/A'}</div>
                    </div>
                </div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Dirección</span>
                        <div class="info-value">${proveedor.direccion || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Código Postal</span>
                        <div class="info-value">${proveedor.codigo_postal || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email</span>
                        <div class="info-value">${proveedor.email || 'N/A'}</div>
                    </div>
                </div>
            </section>
            
            <!-- Líneas de Pedido -->
            <section class="section lines-section">
                <h2 class="section-title">Líneas de Pedido (${lineasPedido.length} elemento${lineasPedido.length !== 1 ? 's' : ''})</h2>
                <div class="lines-grid">
                    ${generarLineasPedidoHTML()}
                </div>
            </section>
        </main>
        
        <footer class="footer">
            <p>Documento generado automáticamente por el sistema de gestión de pedidos RENFE</p>
            <p>© ${new Date().getFullYear()} RENFE - Ingeniería y Mantenimiento</p>
        </footer>
    </div>
</body>
</html>`;
};

  // Función para procesar proveedores internos
  const procesarProveedorInterno = async (numeroPedido: string) => {
    try {
      // Obtener datos completos del pedido
      const orderData = await fetchCompleteOrderData(numeroPedido);
      if (!orderData) {
        throw new Error('No se pudieron obtener los datos del pedido');
      }

      // Generar Excel usando la plantilla interna
      const excelBuffer = await generateInternalSupplierExcel(orderData);
      
      // Crear blob y descargar
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Generar nombre de archivo con timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const fileName = `PAR_Interno_${numeroPedido.replace(/\//g, '_')}_${timestamp}.xlsx`;
      
      // Descargar archivo
      saveAs(blob, fileName);
      
      toast({
        title: "Excel generado correctamente",
        description: `El archivo ${fileName} se ha descargado en su carpeta de Descargas.`,
      });
      
    } catch (error) {
      console.error('Error processing internal supplier PAR:', error);
      toast({
        variant: "destructive",
        title: "Error al generar Excel",
        description: error instanceof Error ? error.message : "Error desconocido al procesar el PAR interno",
      });
    }
  };

  const handleOrderNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 4) {
      setOrderNumberInput(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLanzarParAccept();
    }
  };

  // Función para obtener datos completos del pedido
  const fetchCompleteOrderData = async (numeroPedido: string) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('tbl_pedidos_rep')
        .select(`
          *,
          tbl_proveedores(*),
          tbl_ln_pedidos_rep(*)
        `)
        .eq('num_pedido', numeroPedido)
        .single();

      if (orderError) {
        throw orderError;
      }

      return orderData;
    } catch (error) {
      console.error('Error fetching complete order data:', error);
      return null;
    }
  };

  // Función para reemplazar placeholders en la plantilla
  const replaceTemplatePlaceholders = (template: string, orderData: any) => {
    let processedHTML = template;

    // Formatear fecha de envío
    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    };

    // Reemplazos básicos del pedido
    processedHTML = processedHTML.replace(/{num_pedido}/g, orderData.num_pedido || '');
    processedHTML = processedHTML.replace(/{fecha_envio}/g, formatDate(orderData.fecha_envio));
    processedHTML = processedHTML.replace(/{información_nc}/g, orderData.garantia ? 'SÍ' : 'NO');
    processedHTML = processedHTML.replace(/{avería_declarada}/g, orderData.averia_declarada || '');

    // Reemplazos del proveedor
    if (orderData.tbl_proveedores) {
      const proveedor = orderData.tbl_proveedores;
      processedHTML = processedHTML.replace(/{nombre}/g, proveedor.nombre || '');
      processedHTML = processedHTML.replace(/{direccion}/g, proveedor.direccion || '');
      processedHTML = processedHTML.replace(/{ciudad}/g, proveedor.ciudad || '');
      processedHTML = processedHTML.replace(/{codigo_postal}/g, proveedor.codigo_postal || '');
      processedHTML = processedHTML.replace(/{provincia}/g, proveedor.provincia || '');
      processedHTML = processedHTML.replace(/{email_empresa}/g, proveedor.email || '');
    }
    // Generar filas de líneas de pedido
    let orderLinesHtml = '';
    if (orderData.tbl_ln_pedidos_rep && orderData.tbl_ln_pedidos_rep.length > 0) {
      orderLinesHtml = orderData.tbl_ln_pedidos_rep.map((line: any) => `
        <tr>
          <td class="center">${line.registration || ''}</td>
          <td>${line.partDescription || ''}</td>
          <td class="center">${line.quantity || ''}</td>
          <td class="center">${line.serialNumber || ''}</td>
        </tr>
      `).join('');
    } else {
      orderLinesHtml = `
        <tr>
          <td colspan="4" class="center">No hay líneas de pedido para mostrar.</td>
        </tr>
      `;
    }
    processedHTML = processedHTML.replace('<!-- ORDER_LINES_PLACEHOLDER -->', orderLinesHtml);

    return processedHTML;
  };

  // Función para reemplazar logo
  const replaceLogo = (html: string) => {
    // Logo embebido en base64 - Imagen simple de Renfe
    const logoBase64 = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRkYwMDAwIi8+Cjx0ZXh0IHg9IjEwIiB5PSIzMCIgZmlsbD0iI0ZGRkZGRiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+UkVORkU8L3RleHQ+Cjx0ZXh0IHg9IjEwIiB5PSI0NSIgZmlsbD0iI0ZGRkZGRiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIj5JbmdlbmllcsOtYSB5IE1hbnRlbmltaWVudG88L3RleHQ+Cjwvc3ZnPgo=`;
    
    // Buscar y reemplazar el div del logo específico
    let replacedHtml = html.replace(
      /<div\s+class="logo"[^>]*>.*?<\/div>/gi,
      `<div class="logo"><img width="200" height="50" src="${logoBase64}" alt="Logo Renfe" style="max-width: 100%; height: auto;"></div>`
    );
    
    // Buscar también el patrón "🚄 Logo Renfe" y reemplazarlo
    replacedHtml = replacedHtml.replace(
      /🚄\s*Logo\s*Renfe/gi,
      `<img width="200" height="50" src="${logoBase64}" alt="Logo Renfe" style="max-width: 100%; height: auto;">`
    );
    
    return replacedHtml;
  };

  // Funciones del modal de impresión
  const handleSave = () => {
    try {
      // Crear el contenido HTML completo
      const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Documento PAR</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      padding: 0;
    }
    @media print {
      @page {
        size: landscape;
        margin: 0.5in;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${generatedHTML}
</body>
</html>`;

      // Crear blob con el HTML
      const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
      
      // Crear URL temporal para la descarga
      const url = URL.createObjectURL(blob);
      
      // Crear elemento de descarga
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `documento_PAR_${Date.now()}.html`;
      
      // Simular click para descargar
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Limpiar
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Archivo guardado",
        description: "El documento HTML se ha descargado correctamente.",
      });
      
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudo guardar el archivo. Inténtelo de nuevo.",
      });
    }
  };

  const handleCancelSave = () => {
    setShowPrintModal(false);
    setGeneratedHTML('');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Gestión de Pedidos</h1>
        <div className="flex gap-3">
          <Button 
            onClick={handleLanzarPAR}
            className="bg-[#107C41] hover:bg-[#0D5B2F] text-white"
          >
            <Star className="mr-2 h-4 w-4" /> Lanzar PAR
          </Button>
          <Button 
            onClick={handleNewOrder}
            className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Pedido
          </Button>
        </div>
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
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  <TableCell className="font-medium cursor-pointer" onClick={() => handleViewDetails(order)}>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => handleViewDetails(order)}>
                    <span className="inline-flex items-center justify-center rounded-md border bg-gray-50 px-2 py-1 text-xs">
                      {order.warehouse}
                    </span>
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => handleViewDetails(order)}>{order.supplierName}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => handleViewDetails(order)}>{order.vehicle}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => handleViewDetails(order)}>
                    {order.shipmentDate ? format(new Date(order.shipmentDate), 'dd/MM/yyyy') : '--'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteOrder(order.id);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
      
      {selectedOrder && showForm && (
        <OrderForm
          order={selectedOrder}
          open={showForm}
          onClose={handleCloseForm}
          onSave={handleSaveOrder}
          isEditing={isEditing}
          viewMode={isEditing}
        />
      )}
      
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
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
              onClick={handleDeleteOrder}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lanzar PAR Modal */}
      <Dialog open={showLanzarParModal} onOpenChange={setShowLanzarParModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Introducir Número de Pedido</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Últimas 4 cifras del pedido
                </label>
                <Input
                  id="orderNumber"
                  type="text"
                  value={orderNumberInput}
                  onChange={handleOrderNumberChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ej: 1001"
                  className="w-full text-center text-lg tracking-wider"
                  maxLength={4}
                  autoFocus
                />
              </div>
              
              <p className="text-sm text-gray-600 text-center">
                Introduce las 4 últimas cifras del número de pedido
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={handleLanzarParCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLanzarParAccept}
              className="flex-1 bg-[#91268F] hover:bg-[#7A1F79] text-white"
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Confirmation Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">Documento PAR generado</DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-6 py-4">
            <div className="flex-1">
              <p className="text-lg mb-4">El documento PAR se ha generado.</p>
              <p className="text-sm text-gray-600 mb-6">
                Puede guardar el documento HTML en su equipo o cancelar la operación.
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  className="bg-[#107C41] hover:bg-[#0D5B2F] text-white flex-1"
                >
                  Guardar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelSave}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
            
            {/* Preview del documento */}
            <div className="w-80 border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-2 text-xs text-center font-medium">
                Vista previa del documento
              </div>
              <div className="h-96 overflow-auto p-4 text-xs">
                <div 
                  dangerouslySetInnerHTML={{ __html: generatedHTML }} 
                  style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%' }}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <p className="text-xs text-gray-500">
              El documento se guardará como archivo HTML con formato optimizado
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}