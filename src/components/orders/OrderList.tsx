import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Order } from "@/types";
import OrderForm from "./OrderForm";
import { warehouses, getOrders, deleteOrder } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Search, Star, Trash2 } from "lucide-react";
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
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showForm, setShowForm] = useState(false);
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

    let maxSequential = 999; // Comenzar en 999 para que el siguiente sea 1000

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
      setIsEditing(true);
      setShowForm(true);
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
      if (!orderNumberInput.trim() || orderNumberInput.length !== 4) {
        toast({
          variant: "destructive",
          title: "Entrada inválida",
          description: "Por favor, introduce exactamente 4 dígitos del pedido.",
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

        // 1. Fetch data ONCE before branching
        const orderData = await fetchCompleteOrderData(orderFound.num_pedido);
        if (!orderData) {
          toast({
            variant: "destructive",
            title: "Error de datos",
            description: "No se pudieron obtener los datos completos del pedido.",
          });
          return;
        }

        // 2. Pass the fetched data to the appropriate function
        if (supplier.es_externo === true) {
          await procesarProveedorExterno(orderData);
        } else {
          await procesarProveedorInterno(orderData);
        }

      } catch (error) {
        console.error('Error processing PAR:', error);
        toast({
          variant: "destructive",
          title: "Error en el proceso",
          description: "Ocurrió un error al procesar el PAR. Inténtelo de nuevo.",
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

    // Función para procesar proveedores externos - MODIFICADA
    const procesarProveedorExterno = async (orderData: any) => {
      try {
        // Obtener el logo en base64
        const response = await fetch('/images/logo_renfe_ext.jpg');
        const blob = await response.blob();
        const logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        // Generar HTML directamente con formato A4 vertical
        //NOTA, HAY QUE SUSTITURLO POR LA HOJA HTML CORRESPONDIENTE
        const documentHTML = generateProveedorExternoHTML(orderData, logoBase64 as string);

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

    /*
     Nueva función para generar HTML con formato A4 vertical estilo minimalista
     */
    const generateProveedorExternoHTML = (orderData: any, logoBase64: string) => {
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      };


      const proveedor = orderData.tbl_proveedores || {};
      const lineasPedido = orderData.tbl_ln_pedidos_rep || [];

      // Generar filas de la tabla de líneas de pedido
      const generarFilasTabla = () => {
        if (!lineasPedido || lineasPedido.length === 0) {
          return `<tr><td colspan="4" style="text-align: center; font-style: italic;">No hay líneas de pedido disponibles</td></tr>`;
        }

        return lineasPedido.map((linea) => `
      <tr>
        <td style="text-align: center;">${linea.matricula_89 || 'N/A'}</td>
        <td>${linea.descripcion || 'N/A'}</td>
        <td style="text-align: center;">${linea.nenv || '0'}</td>
        <td style="text-align: center;">${linea.nsenv || 'N/A'}</td>
      </tr>
    `).join('');
      };

      return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pedido de Reparacion - ${orderData.num_pedido}</title>
    <link rel="stylesheet" href="/css/estilo_html_ext.css">
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <img src="${logoBase64}" alt="Logo Renfe" style="height: 50px; width: auto;">
        </div>
        <div class="header-right">
        <div style="font-size: 16px;"><strong>Número de Pedido de Reparación:</strong> ${orderData.num_pedido || 'N/A'}</div>
        <br />    
        <div>Fecha Envio: ${formatDate(orderData.fecha_envio)}</div>
        <div>Garantia (No Conformidad): ${orderData.informacion_nc || 'No Procede'}</div>
        </div>
    </div>
    
    <div class="document-title">
        Carta de Reparacion de Servicios al Exterior (PAR)
    </div>
    
    <div class="two-column">
        <div class="column">
            <h3>Remitente:</h3>
            <div><strong>Base de Mantenimiento de Valencia</strong></div>
            <div>Camino Moli de Bonjoch, s/n</div>
            <div>46013 - Valencia</div>
            <div>Tel. 963-357-275 // 392</div>
            <div>almacenvalencia140@renfe.es</div>
            <div>almacenvalencia14@renfe.es</div>
        </div>
        
        <div class="column">
            <h3>Destinatario:</h3>
            <div><strong>${proveedor.nombre || 'N/A'}</strong></div>
            <div>${proveedor.direccion || 'N/A'}</div>
            <div>${proveedor.codigo_postal || 'N/A'} - ${proveedor.ciudad || 'N/A'}</div>
            <div>${proveedor.provincia || 'N/A'}</div>
            <div>${proveedor.email_empresa || 'N/A'}</div>
        </div>
    </div>
    
    <div class="notes-section">
        <h3>Observaciones a tener en cuenta en la reparación:</h3>
        <div class="notes-content">
            ${orderData.averia_declarada || 'Avería no especificada'}
        </div>
    </div>
    
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th style="width: 15%;">MATRÍCULA</th>
                    <th style="width: 50%;">DESCRIPCIÓN</th>
                    <th style="width: 10%;">CANTIDAD</th>
                    <th style="width: 25%;">NUM. SERIE</th>
                </tr>
            </thead>
            <tbody>
                ${generarFilasTabla()}
            </tbody>
        </table>
    </div>
    
    <div class="footer-instructions">
        <p>Envíen oferta económica y plazo previsto de entrega a las direcciones de correo-e indicadas en este documento.</p>
        <p>La oferta les será devuelta aceptada, requisito previo indispensable ANTES de proceder a la realización de cualquier reparación.</p>
        <p>Para una mejor trazabilidad, hagan referencia en todas las comunicaciones a nuestro número de Carta de Pedido de Reparación.</p>
        <p>A la entrega del material reparado incluyan la documentación de calidad requerida por nuestras Especificaciones Técnicas.</p>
        <p>CODIGOS DP PARA PETICIONES DE REPARACION SIN NÚMERO DE PEDIDO (POR SERVICIOS)</p>
        <p><strong>DP16000069: ALMACÉN 140 || DP16000073: ALMACÉN 141</strong></p>
    </div>
</body>
</html>`;
    };
    //** FIN DEL CODIGO GENERACION PAR EXTERNO */

    // Función para procesar proveedores internos
    const procesarProveedorInterno = async (orderData: any) => {
      try {
        // Generar Excel usando la plantilla interna
        const excelBuffer = await generateInternalSupplierExcel(orderData);

        // Crear blob y descargar
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Generar nombre de archivo con timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const fileName = `PAR_Interno_${orderData.num_pedido.replace(/\//g, '_')}_${timestamp}.xlsx`;

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