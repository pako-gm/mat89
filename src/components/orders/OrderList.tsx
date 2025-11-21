import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Order } from "@/types";
import OrderForm from "./OrderForm";
import { warehouses, getOrders, deleteOrder, cancelOrder, reactivateOrder, ENABLE_REAL_ORDER_DELETION } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Search, Star, Trash2, Check } from "lucide-react";
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
  DialogDescription,
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
import { saveAs } from "file-saver";
import XlsxPopulate from "xlsx-populate";

export default function OrderList() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  // Lanzar PAR modal state
  const [showLanzarParModal, setShowLanzarParModal] = useState(false);
  const [orderNumberInput, setOrderNumberInput] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;
  const [searchQuery, setSearchQuery] = useState("");

  // PAR generation modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [generatedHTML, setGeneratedHTML] = useState("");
  const [currentOrderData, setCurrentOrderData] = useState<any>(null);

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

    const confirmCancelOrder = (orderId: string) => {
      if (ENABLE_REAL_ORDER_DELETION) {
        // Si el flag está activado, usar borrado real
        setOrderToDelete(orderId);
        setShowDeleteConfirmation(true);
      } else {
        // Comportamiento original: soft delete / cancelar
        setOrderToCancel(orderId);
        setShowCancelConfirmation(true);
      }
    };

    const handleCancelOrder = async () => {
      setShowCancelConfirmation(false);
      try {
        if (!orderToCancel) return;
        await cancelOrder(orderToCancel);
        const updatedOrders = await getOrders();
        setOrders(updatedOrders);
        setFilteredOrders(updatedOrders);
        toast({
          title: "Pedido cancelado",
          description: "El pedido se ha cancelado correctamente",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cancelar el pedido. Por favor, inténtelo de nuevo.",
        });
      }
      setOrderToCancel(null);
    };

    const handleReactivateOrder = async (orderId: string) => {
      try {
        await reactivateOrder(orderId);
        const updatedOrders = await getOrders();
        setOrders(updatedOrders);
        setFilteredOrders(updatedOrders);
        toast({
          title: "Pedido reactivado",
          description: "El pedido se ha reactivado correctamente",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo reactivar el pedido. Por favor, inténtelo de nuevo.",
        });
      }
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

    const handleViewDetails = async (order: Order) => {
      // No permitir abrir pedidos cancelados
      if (order.cancelado) {
        toast({
          variant: "destructive",
          title: "Pedido cancelado",
          description: "Este pedido está cancelado y no se puede editar. Reactívalo primero.",
        });
        return;
      }

      // Recargar el pedido desde la base de datos para tener datos frescos
      try {
        const { data: freshOrder, error } = await supabase
          .from('tbl_pedidos_rep')
          .select(`
            *,
            tbl_proveedores!inner(nombre),
            tbl_ln_pedidos_rep (*),
            tbl_historico_cambios (*)
          `)
          .eq('id', order.id)
          .single();

        if (error) throw error;

        if (freshOrder) {
          const formattedOrder: Order = {
            id: freshOrder.id,
            orderNumber: freshOrder.num_pedido,
            warehouse: freshOrder.alm_envia,
            supplierId: freshOrder.proveedor_id,
            supplierName: freshOrder.tbl_proveedores.nombre,
            vehicle: freshOrder.vehiculo,
            warranty: freshOrder.garantia,
            nonConformityReport: freshOrder.informacion_nc,
            dismantleDate: freshOrder.fecha_desmonte,
            shipmentDate: freshOrder.fecha_envio,
            declaredDamage: freshOrder.averia_declarada,
            shipmentDocumentation: freshOrder.documentacion || [],
            estadoPedido: freshOrder.estado_pedido || 'PENDIENTE',
            changeHistory: (freshOrder.tbl_historico_cambios || [])
              .filter((change: any) => change.descripcion_cambio && change.descripcion_cambio.trim())
              .map((change: any) => ({
                id: change.id,
                date: change.created_at,
                user: change.usuario || 'usuario@mat89.com',
                description: change.descripcion_cambio
              })),
            orderLines: (freshOrder.tbl_ln_pedidos_rep || []).map((line: any) => ({
              id: line.id,
              registration: line.matricula_89,
              partDescription: line.descripcion,
              quantity: line.nenv,
              serialNumber: line.nsenv,
              completionStatus: line.estado_completado
            }))
          };

          setSelectedOrder(formattedOrder);
          setIsEditing(true);
          setShowForm(true);
        }
      } catch (error) {
        console.error('Error loading order details:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el pedido",
        });
      }
    };


    const handleCloseForm = () => {
      setShowForm(false);
      setSelectedOrder(null);
      setIsEditing(false);
    };

    const handleSaveOrder = async () => {
      const action = isEditing ? "actualizado" : "creado";

      try {
        // Primero recargar los pedidos
        const updatedOrders = await getOrders();
        setOrders(updatedOrders);
        setFilteredOrders(updatedOrders);

        // Luego cerrar el modal
        setShowForm(false);
        setSelectedOrder(null);
        setIsEditing(false);

        // Mostrar toast después de actualizar
        toast({
          title: `Pedido ${action}`,
          description: `El pedido se ha ${action} correctamente`,
        });
      } catch (error) {
        console.error('Error refreshing orders:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "El pedido se guardó pero hubo un error al actualizar la lista",
        });
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
        // Carga la plantilla desde /plantillas/ext_html_template.html
        const documentHTML = await generateProveedorExternoHTML(orderData, logoBase64 as string);

        setGeneratedHTML(documentHTML);
        setCurrentOrderData(orderData); // Guardar datos del pedido para el nombre del archivo
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
     Carga la plantilla HTML desde /plantillas/ext_html_template.html
     */
    const generateProveedorExternoHTML = async (orderData: any, logoBase64: string): Promise<string> => {
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      };

      // Cargar plantilla HTML
      const templateResponse = await fetch('/plantillas/ext_html_template.html');
      if (!templateResponse.ok) {
        throw new Error('No se pudo cargar la plantilla HTML. Verifique que el archivo existe en /public/plantillas/');
      }
      let htmlTemplate = await templateResponse.text();

      const proveedor = orderData.tbl_proveedores || {};
      const lineasPedido = orderData.tbl_ln_pedidos_rep || [];

      // Generar filas de la tabla de líneas de pedido
      const generarFilasTabla = () => {
        if (!lineasPedido || lineasPedido.length === 0) {
          return `<tr><td colspan="4" style="text-align: center; font-style: italic;">No hay líneas de pedido disponibles</td></tr>`;
        }

        return lineasPedido.map((linea: any) => `
      <tr>
        <td style="text-align: center;">${linea.matricula_89 || 'N/A'}</td>
        <td>${linea.descripcion || 'N/A'}</td>
        <td style="text-align: center;">${linea.nenv || '0'}</td>
        <td style="text-align: center;">${linea.nsenv || 'N/A'}</td>
      </tr>
    `).join('');
      };

      // Reemplazar placeholders en la plantilla
      htmlTemplate = htmlTemplate
        .replace(/{{LOGO_BASE64}}/g, logoBase64)
        .replace(/{{NUM_PEDIDO}}/g, orderData.num_pedido || 'N/A')
        .replace(/{{FECHA_ENVIO}}/g, formatDate(orderData.fecha_envio))
        .replace(/{{INFORMACION_NC}}/g, orderData.informacion_nc || 'No Procede')
        .replace(/{{PROVEEDOR_NOMBRE}}/g, proveedor.nombre || 'N/A')
        .replace(/{{PROVEEDOR_DIRECCION}}/g, proveedor.direccion || 'N/A')
        .replace(/{{PROVEEDOR_CP}}/g, proveedor.codigo_postal || 'N/A')
        .replace(/{{PROVEEDOR_CIUDAD}}/g, proveedor.ciudad || 'N/A')
        .replace(/{{PROVEEDOR_PROVINCIA}}/g, proveedor.provincia || 'N/A')
        .replace(/{{PROVEEDOR_EMAIL}}/g, proveedor.email_empresa || 'N/A')
        .replace(/{{AVERIA_DECLARADA}}/g, orderData.averia_declarada || 'Avería no especificada')
        .replace(/{{LINEAS_PEDIDO}}/g, generarFilasTabla());

      return htmlTemplate;
    };
    //** FIN DEL CODIGO GENERACION PAR EXTERNO */

    // Función MEJORADA para procesar proveedores internos con XLSX-Populate
    const procesarProveedorInterno = async (orderData: any) => {
      try {
        // 1. Cargar la plantilla Excel desde public/plantillas/
        const templateResponse = await fetch('/plantillas/int_excel_template.xlsx');
        if (!templateResponse.ok) {
          throw new Error('No se pudo cargar la plantilla Excel. Verifique que el archivo existe en /public/plantillas/');
        }

        const templateBlob = await templateResponse.blob();
        const templateArrayBuffer = await templateBlob.arrayBuffer();

        // 2. Cargar la plantilla con XLSX-Populate
        const workbook = await XlsxPopulate.fromDataAsync(templateArrayBuffer);
        const sheet = workbook.sheet(0); // Primera hoja

        // 3. Obtener datos del pedido
        const proveedor = orderData.tbl_proveedores || {};
        const lineasPedido = orderData.tbl_ln_pedidos_rep || [];

        // 4. Función auxiliar para formatear fechas
        const formatDate = (dateString: string) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        };

        // 5. Función para calcular fecha_necesidad (fecha_envio + 15 días)
        const calcularFechaNecesidad = (fechaEnvio: string) => {
          if (!fechaEnvio) return '';
          const fecha = new Date(fechaEnvio);
          fecha.setDate(fecha.getDate() + 15);
          return formatDate(fecha.toISOString());
        };

        // 6. Rellenar datos de cabecera en posiciones específicas
        sheet.cell("D4").value(proveedor.nombre || ''); // tbl_proveedores.nombre
        sheet.cell("F2").value(formatDate(orderData.fecha_envio)); // tbl_pedidos_rep.fecha_envio
        sheet.cell("F4").value(orderData.num_pedido || ''); // tbl_pedidos_rep.numero_pedido

        // 7. Función para obtener descripción del material por matrícula
        const obtenerDescripcionMaterial = async (matricula: string) => {
          try {
            const { data: material, error } = await supabase
              .from('tbl_materiales')
              .select('descripcion')
              .eq('matricula_89', matricula)
              .single();

            if (error || !material) {
              console.warn(`No se encontró descripción para matrícula: ${matricula}`);
              return 'Descripción no disponible';
            }

            return material.descripcion;
          } catch (error) {
            console.error('Error obteniendo descripción del material:', error);
            return 'Error al obtener descripción';
          }
        };

        // 8. Procesar líneas de pedido a partir de la fila 7
        let currentRow = 7;

        for (const linea of lineasPedido) {
          // Obtener descripción del material
          const descripcion = await obtenerDescripcionMaterial(linea.matricula_89 || '');

          // Rellenar cada línea en su fila correspondiente
          sheet.cell(`B${currentRow}`).value(descripcion); // tbl_materiales.descripcion
          sheet.cell(`C${currentRow}`).value(orderData.vehiculo || ''); // tbl_pedidos_rep.vehiculo
          sheet.cell(`D${currentRow}`).value(linea.nsenv || ''); // tbl_ln_pedidos_rep.nsenv
          sheet.cell(`E${currentRow}`).value(linea.matricula_89 || ''); // tbl_materiales.matricula
          sheet.cell(`F${currentRow}`).value(orderData.alm_envia || ''); // tbl_pedidos_rep.alm_envia
          sheet.cell(`G${currentRow}`).value(linea.nenv || ''); // tbl_ln_pedidos_rep.nenv
          sheet.cell(`H${currentRow}`).value(calcularFechaNecesidad(orderData.fecha_envio)); // fecha_necesidad (fecha_envio + 15 días)

          currentRow++;
        }

        // 9. Generar el archivo Excel final
        const outputBuffer = await workbook.outputAsync();

        // 10. Crear blob y descargar
        const blob = new Blob([outputBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // 11. Generar nombre de archivo: numeroPedido_proveedor_fecha.xlsx
        const numPedido = orderData.num_pedido || 'SinNumero';
        const nombreProveedor = proveedor.nombre || 'SinProveedor';
        const fechaEnvio = orderData.fecha_envio;

        // Formatear fecha como YYYYMMDD
        let fechaFormateada = '';
        if (fechaEnvio) {
          const date = new Date(fechaEnvio);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          fechaFormateada = `${year}${month}${day}`;
        } else {
          fechaFormateada = 'SinFecha';
        }

        // Limpiar caracteres especiales del número de pedido y nombre del proveedor
        const numPedidoLimpio = numPedido.replace(/[^a-zA-Z0-9]/g, '_');
        const proveedorLimpio = nombreProveedor.replace(/[^a-zA-Z0-9]/g, '_');

        const fileName = `${numPedidoLimpio}_${proveedorLimpio}_${fechaFormateada}.xlsx`;

        // 12. Descargar archivo
        saveAs(blob, fileName);

        toast({
          title: "Excel generado correctamente",
          description: `El archivo ${fileName} se ha descargado con ${lineasPedido.length} líneas de pedido.`,
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
        // Generar nombre del archivo: numeroPedido_proveedor_fecha
        let fileName = `documento_PAR_${Date.now()}.html`;

        if (currentOrderData) {
          const numPedido = currentOrderData.num_pedido || 'SinNumero';
          const proveedor = currentOrderData.tbl_proveedores?.nombre || 'SinProveedor';
          const fechaEnvio = currentOrderData.fecha_envio;

          // Formatear fecha como YYYYMMDD
          let fechaFormateada = '';
          if (fechaEnvio) {
            const date = new Date(fechaEnvio);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            fechaFormateada = `${year}${month}${day}`;
          } else {
            fechaFormateada = 'SinFecha';
          }

          // Limpiar caracteres especiales del nombre del proveedor
          const proveedorLimpio = proveedor.replace(/[^a-zA-Z0-9]/g, '_');

          fileName = `${numPedido}_${proveedorLimpio}_${fechaFormateada}.html`;
        }

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
        downloadLink.download = fileName;

        // Simular click para descargar
        document.body.appendChild(downloadLink);
        downloadLink.click();

        // Limpiar
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);

        toast({
          title: "Archivo guardado",
          description: "El documento HTML se ha generado correctamente.",
        });

        // Cerrar el modal después de guardar
        setShowPrintModal(false);
        setGeneratedHTML('');
        setCurrentOrderData(null);

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
      setCurrentOrderData(null);
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
                    className={`transition-colors duration-200 ${
                      order.cancelado
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <TableCell
                      className={`font-medium ${!order.cancelado ? 'cursor-pointer' : ''} ${
                        order.cancelado ? 'line-through text-red-600' : ''
                      }`}
                      onClick={() => !order.cancelado && handleViewDetails(order)}
                    >
                      {order.orderNumber}
                    </TableCell>
                    <TableCell
                      className={!order.cancelado ? 'cursor-pointer' : ''}
                      onClick={() => !order.cancelado && handleViewDetails(order)}
                    >
                      <span className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs ${
                        order.cancelado ? 'bg-red-100 border-red-300 line-through text-red-600' : 'bg-gray-50'
                      }`}>
                        {order.warehouse}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`${!order.cancelado ? 'cursor-pointer' : ''} ${
                        order.cancelado ? 'line-through text-red-600' : ''
                      }`}
                      onClick={() => !order.cancelado && handleViewDetails(order)}
                    >
                      {order.supplierName}
                    </TableCell>
                    <TableCell
                      className={`${!order.cancelado ? 'cursor-pointer' : ''} ${
                        order.cancelado ? 'line-through text-red-600' : ''
                      }`}
                      onClick={() => !order.cancelado && handleViewDetails(order)}
                    >
                      {order.vehicle}
                    </TableCell>
                    <TableCell
                      className={`${!order.cancelado ? 'cursor-pointer' : ''} ${
                        order.cancelado ? 'line-through text-red-600' : ''
                      }`}
                      onClick={() => !order.cancelado && handleViewDetails(order)}
                    >
                      {order.shipmentDate ? format(new Date(order.shipmentDate), 'dd/MM/yyyy') : '--'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!order.cancelado ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmCancelOrder(order.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReactivateOrder(order.id);
                            }}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 h-8 w-8"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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

        {!ENABLE_REAL_ORDER_DELETION && (
          <AlertDialog open={showCancelConfirmation} onOpenChange={setShowCancelConfirmation}>
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl">Cancelar pedido</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  Vas a cancelar el pedido. Pulsa 'Cancelar Pedido' para deshabilitarlo o pulsa 'Volver' para cerrar esta pantalla.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                  Volver
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={handleCancelOrder}
                >
                  Cancelar Pedido
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Lanzar PAR Modal */}
        <Dialog open={showLanzarParModal} onOpenChange={setShowLanzarParModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Introducir Número de Pedido</DialogTitle>
              <DialogDescription>
                Introduce las 4 últimas cifras del número de pedido
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="space-y-4">
                <div>
                  {/* <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Últimas 4 cifras del pedido
                  </label> */}
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
              <DialogDescription>
                El documento generado se guardará en la carpeta de descargas de tu equipo.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-6 py-4">
              <div className="flex-1">

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