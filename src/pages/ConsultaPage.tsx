import { useState, useEffect } from "react";
import { ConsultaRecord } from "@/types";
import { getConsultationData } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PrintModal from "@/components/ui/print-modal";
import LineDetailsAccordion from "@/components/consulta/LineDetailsAccordion";

export default function ConsultaPage() {
  const [consultationData, setConsultationData] = useState<ConsultaRecord[]>([]);
  const [filteredData, setFilteredData] = useState<ConsultaRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");

  // Estado para el Accordion de línea
  const [expandedLineKey, setExpandedLineKey] = useState<string | null>(null);

  const { toast } = useToast();
  const recordsPerPage = 10;

  useEffect(() => {
    fetchConsultationData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, consultationData]);

  const fetchConsultationData = async () => {
    setIsLoading(true);
    try {
      const data = await getConsultationData();
      setConsultationData(data);
      setFilteredData(data);
    } catch (error) {
      console.error("Error fetching consultation data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos de consulta.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineClick = (lineId: string, recepcionId: string | null) => {
    const lineKey = `${lineId}-${recepcionId}`;

    // Toggle: Si ya está expandido, colapsar
    if (expandedLineKey === lineKey) {
      setExpandedLineKey(null);
    } else {
      setExpandedLineKey(lineKey);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchConsultationData();
      toast({
        title: "Datos actualizados",
        description: "Los datos han sido actualizados correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar los datos.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const filterData = () => {
    if (!searchQuery.trim()) {
      setFilteredData(consultationData);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = consultationData.filter(record => {
      // Si no hay estado de recepción, buscar por "sin recepción"
      const estadoParaBusqueda = record.estadoRecepc || 'sin recepción';

      return String(record.numPedido || '').toLowerCase().includes(query) ||
        String(record.mat89 || '').toLowerCase().includes(query) ||
        String(record.proveedor || '').toLowerCase().includes(query) ||
        String(record.descripcion || '').toLowerCase().includes(query) ||
        String(record.vehiculo || '').toLowerCase().includes(query) ||
        String(record.fechaEnvio || '').includes(query) ||
        (record.numSerieEnv && String(record.numSerieEnv).toLowerCase().includes(query)) ||
        (record.fechaRecepc && String(record.fechaRecepc).includes(query)) ||
        (record.numSerieRec && String(record.numSerieRec).toLowerCase().includes(query)) ||
        String(estadoParaBusqueda).toLowerCase().includes(query);
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const getReceptionStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toUpperCase()) {
      case 'UTIL': return 'bg-green-500 text-white';
      case 'IRREPARABLE': return 'bg-red-500 text-white';
      case 'SIN RECEPCIÓN': return 'bg-blue-100 text-blue-800';
      case 'SIN ACTUACION': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const generateHTMLDocument = () => {
    // Usar TODOS los registros filtrados, no solo los de la página actual
    const recordsToExport = filteredData;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Consulta de Envíos y Recepciones - Mat89</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #91268F;
            padding-bottom: 10px;
          }
          .header h1 {
            color: #91268F;
            margin: 0;
            font-size: 24px;
          }
          .header .subtitle {
            color: #666;
            margin: 5px 0;
            font-size: 14px;
          }
          .info-section {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .info-left {
            font-size: 14px;
            color: #334155;
          }
          .info-right {
            font-size: 12px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
            font-size: 10px;
          }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #334155;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .status-util {
            background-color: #d4edda;
            color: #155724;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
          }
          .status-irreparable {
            background-color: #f8d7da;
            color: #721c24;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
          }
          .status-sin-actuacion {
            background-color: #fff3cd;
            color: #856404;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
          }
          .status-otros {
            background-color: #d1ecf1;
            color: #0c5460;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
          }
          .status-sin-recepcion {
            background-color: #f3f4f6;
            color: #6b7280;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          @media print {
            body {
              margin: 0;
              font-size: 10px;
            }
            .header h1 {
              font-size: 20px;
            }
            th, td {
              padding: 4px;
              font-size: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mat89 - Sistema de Gestión de Reparación de Componentes</h1>
          <div class="subtitle">Consulta de Envíos y Recepciones</div>
        </div>

        <div class="info-section">
          <div class="info-left">
            <strong>Total de registros mostrados:</strong> ${recordsToExport.length}
            ${searchQuery ? ` (filtrados de ${consultationData.length} registros totales)` : ''}
          </div>
          <div class="info-right">
            Generado el: ${new Date().toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Línea</th>
              <th>Alm. Envía</th>
              <th>Num. Pedido</th>
              <th>Proveedor</th>
              <th>Mat. 89</th>
              <th>Descripción</th>
              <th>Vehículo</th>
              <th>F. Envío</th>
              <th>Cant. Env.</th>
              <th>Num. Serie Env.</th>
              <th>F. Recepc.</th>
              <th>Cant. Rec.</th>
              <th>Num. Serie Rec.</th>
              <th>Estado Recepc.</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${recordsToExport.map(record => `
              <tr>
                <td>${record.linea}</td>
                <td>${record.almEnvia}</td>
                <td>${record.numPedido}</td>
                <td>${record.proveedor}</td>
                <td>${record.mat89}</td>
                <td>${record.descripcion}</td>
                <td>${record.vehiculo}</td>
                <td>${formatDate(record.fechaEnvio)}</td>
                <td>${record.cantEnv}</td>
                <td>${record.numSerieEnv || '--'}</td>
                <td>${formatDate(record.fechaRecepc)}</td>
                <td>${record.cantRec !== null ? record.cantRec : '--'}</td>
                <td>${record.numSerieRec || '--'}</td>
                <td>${record.estadoRecepc ? `<span class="status-${record.estadoRecepc.toLowerCase().replace(' ', '-')}">${record.estadoRecepc}</span>` : '<span class="status-sin-recepcion">SIN RECEPCIÓN</span>'}</td>
                <td>${record.observaciones || '--'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <span style="color: #334155; font-weight: bold;">[© fgm-dev]</span> ${new Date().getFullYear() === 2024 ? '2024' : `2024-${new Date().getFullYear()}`} - Sistema de Gestión de Reparación de Componentes
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const handleDownloadData = () => {
    const html = generateHTMLDocument();
    setHtmlContent(html);
    setShowPrintModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-700">
            Consulta de Envíos y Recepciones
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Seguimiento completo de los materiales enviados y recibidos
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex gap-4">
          <div className="relative w-1/2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar envíos por... cualquier dato de la tabla"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 border-black"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setSearchQuery('')}
            className="h-9 border-black hover:bg-gray-50 transition-colors duration-200"
          >
            Borrar Filtro
          </Button>
          <div className="flex gap-3 ml-auto">
            <Button
              onClick={handleDownloadData}
              disabled={isLoading}
              className="flex items-center gap-2 bg-[#2BA6FF] hover:bg-[#2196F3] text-white h-9"
            >
              <Download className="h-4 w-4" />
              Descargar Datos
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="flex items-center gap-2 h-9"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {filteredData.length !== consultationData.length && (
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {filteredData.length} de {consultationData.length} registros
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50 z-10">
              <TableRow>
                <TableHead className="text-center font-medium min-w-[120px] border-r">Num. Pedido</TableHead>
                <TableHead className="text-center font-medium min-w-[80px] border-r">Alm. Envía</TableHead>
                <TableHead className="text-center font-medium min-w-[100px] border-r">Mat. 89</TableHead>
                <TableHead className="text-center font-medium min-w-[200px] border-r">Descripción</TableHead>
                <TableHead className="text-center font-medium min-w-[150px] border-r">Proveedor</TableHead>
                <TableHead className="text-center font-medium min-w-[100px] border-r">Vehículo</TableHead>
                <TableHead className="text-center font-medium min-w-[100px] border-r">F. Envío</TableHead>
                <TableHead className="text-center font-medium min-w-[100px] border-r">F. Recepción</TableHead>
                <TableHead className="text-center font-medium min-w-[120px]">Estado Recepc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#91268F]"></div>
                      <span className="ml-2">Cargando datos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentRecords.length > 0 ? (
                (() => {
                  const rows: JSX.Element[] = [];

                  currentRecords.forEach((record) => {
                    const lineKey = `${record.lineaId}-${record.recepcionId}`;
                    const isExpanded = expandedLineKey === lineKey;

                    // Fila principal (clickable)
                    rows.push(
                      <TableRow
                        key={`row-${lineKey}`}
                        className="hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => handleLineClick(record.lineaId, record.recepcionId)}
                      >
                        <TableCell className="border-r font-medium">
                          {record.numPedido}
                        </TableCell>
                        <TableCell className="text-center border-r">
                          <span className="inline-flex items-center justify-center rounded-md border bg-gray-50 px-2 py-1 text-xs font-medium">
                            {record.almEnvia.toString().startsWith('ALM') ? record.almEnvia : `ALM${record.almEnvia}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-center border-r font-mono text-xs">
                          {record.mat89}
                        </TableCell>
                        <TableCell className="border-r text-sm max-w-[200px] truncate" title={record.descripcion}>
                          {record.descripcion}
                        </TableCell>
                        <TableCell className="border-r text-sm max-w-[150px] truncate" title={record.proveedor}>
                          {record.proveedor}
                        </TableCell>
                        <TableCell className="text-center border-r font-mono text-xs">
                          {record.vehiculo}
                        </TableCell>
                        <TableCell className="text-center border-r text-sm">
                          {formatDate(record.fechaEnvio)}
                        </TableCell>
                        <TableCell className="text-center border-r text-sm">
                          {formatDate(record.fechaRecepc)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getReceptionStatusColor(record.estadoRecepc)}>
                            {record.estadoRecepc || 'SIN RECEPCIÓN'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );

                    // Fila de acordeón (solo si está expandido)
                    if (isExpanded) {
                      rows.push(
                        <TableRow key={`accordion-${lineKey}`}>
                          <TableCell colSpan={9} className="p-0 border-0">
                            <LineDetailsAccordion
                              lineId={record.lineaId}
                              allRecords={filteredData}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    }
                  });

                  return rows;
                })()
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    {searchQuery
                      ? "No se encontraron registros que coincidan con la búsqueda"
                      : "No hay datos disponibles"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredData.length > recordsPerPage && (
          <div className="flex justify-between items-center py-4 px-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Mostrando {indexOfFirstRecord + 1} a {Math.min(indexOfLastRecord, filteredData.length)} de {filteredData.length} registros
            </div>
            
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
              
              <span className="mx-2 flex items-center text-sm text-gray-600 px-3">
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
      </div>

      {/* Print Modal */}
      <PrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        htmlContent={htmlContent}
        title="Vista previa de datos para impresión"
      />
    </div>
  );
}