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
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ConsultaPage() {
  const [consultationData, setConsultationData] = useState<ConsultaRecord[]>([]);
  const [filteredData, setFilteredData] = useState<ConsultaRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const recordsPerPage = 50;

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
    const filtered = consultationData.filter(record =>
      String(record.numPedido || '').toLowerCase().includes(query) ||
      String(record.mat89 || '').toLowerCase().includes(query) ||
      String(record.proveedor || '').toLowerCase().includes(query) ||
      String(record.descripcion || '').toLowerCase().includes(query) ||
      String(record.vehiculo || '').toLowerCase().includes(query) ||
      String(record.fechaEnvio || '').includes(query) ||
      (record.numSerieEnv && String(record.numSerieEnv).toLowerCase().includes(query)) ||
      (record.fechaRecepc && String(record.fechaRecepc).includes(query)) ||
      (record.numSerieRec && String(record.numSerieRec).toLowerCase().includes(query)) ||
      (record.estadoRecepc && String(record.estadoRecepc).toLowerCase().includes(query))
    );

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-500';
    
    switch (status) {
      case 'UTIL':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IRREPARABLE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'SIN ACTUACION':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'OTROS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-500';
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

  return (
    <div className="max-w-full mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Consulta de Envíos y Recepciones</h1>
        <Button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar envíos por... (número pedido, matrícula, proveedor, descripción, vehículo, fecha envío, número serie, fecha recepción, estado recepción)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          {searchQuery && (
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery('')}
              className="h-9"
            >
              Limpiar
            </Button>
          )}
        </div>
        
        {filteredData.length !== consultationData.length && (
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {filteredData.length} de {consultationData.length} registros
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50 z-10">
              <TableRow>
                <TableHead className="text-center font-medium min-w-[60px] border-r">Línea</TableHead>
                <TableHead className="text-center font-medium min-w-[80px] border-r">Alm. Envía</TableHead>
                <TableHead className="text-center font-medium min-w-[120px] border-r">Num. Pedido</TableHead>
                <TableHead className="text-center font-medium min-w-[150px] border-r">Proveedor</TableHead>
                <TableHead className="text-center font-medium min-w-[100px] border-r">Mat. 89</TableHead>
                <TableHead className="text-center font-medium min-w-[200px] border-r">Descripción</TableHead>
                <TableHead className="text-center font-medium min-w-[100px] border-r">Vehículo</TableHead>
                <TableHead className="text-center font-medium min-w-[100px] border-r">F. Envío</TableHead>
                <TableHead className="text-center font-medium min-w-[80px] border-r">Cant. Env.</TableHead>
                <TableHead className="text-center font-medium min-w-[120px] border-r">Num. Serie Env.</TableHead>
                <TableHead className="text-center font-medium min-w-[100px] border-r">F. Recepc.</TableHead>
                <TableHead className="text-center font-medium min-w-[80px] border-r">Cant. Rec.</TableHead>
                <TableHead className="text-center font-medium min-w-[120px] border-r">Num. Serie Rec.</TableHead>
                <TableHead className="text-center font-medium min-w-[120px] border-r">Estado Recepc.</TableHead>
                <TableHead className="text-center font-medium min-w-[200px]">Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#91268F]"></div>
                      <span className="ml-2">Cargando datos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentRecords.length > 0 ? (
                currentRecords.map((record, index) => (
                  <TableRow 
                    key={`${record.pedidoId}-${record.lineaId}-${record.recepcionId || 'no-reception'}-${index}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="text-center border-r font-medium text-sm">
                      {record.linea}
                    </TableCell>
                    <TableCell className="text-center border-r text-sm">
                      <span className="inline-flex items-center justify-center rounded-md border bg-gray-50 px-2 py-1 text-xs">
                        {record.almEnvia}
                      </span>
                    </TableCell>
                    <TableCell className="text-center border-r font-medium text-sm">
                      {record.numPedido}
                    </TableCell>
                    <TableCell className="border-r text-sm max-w-[150px] truncate" title={record.proveedor}>
                      {record.proveedor}
                    </TableCell>
                    <TableCell className="text-center border-r font-mono text-sm">
                      {record.mat89}
                    </TableCell>
                    <TableCell className="border-r text-sm max-w-[200px] truncate" title={record.descripcion}>
                      {record.descripcion}
                    </TableCell>
                    <TableCell className="text-center border-r text-sm">
                      {record.vehiculo}
                    </TableCell>
                    <TableCell className="text-center border-r text-sm">
                      {formatDate(record.fechaEnvio)}
                    </TableCell>
                    <TableCell className="text-center border-r font-medium text-sm">
                      {record.cantEnv}
                    </TableCell>
                    <TableCell className="text-center border-r font-mono text-sm">
                      {record.numSerieEnv || "--"}
                    </TableCell>
                    <TableCell className="text-center border-r text-sm">
                      {formatDate(record.fechaRecepc)}
                    </TableCell>
                    <TableCell className="text-center border-r font-medium text-sm">
                      {record.cantRec !== null ? record.cantRec : "--"}
                    </TableCell>
                    <TableCell className="text-center border-r font-mono text-sm">
                      {record.numSerieRec || "--"}
                    </TableCell>
                    <TableCell className="text-center border-r text-sm">
                      {record.estadoRecepc ? (
                        <span className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs font-medium ${getStatusColor(record.estadoRecepc)}`}>
                          {record.estadoRecepc}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin recepción</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={record.observaciones || ''}>
                      {record.observaciones || "--"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-gray-500">
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

      {/* Summary Section */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-[#91268F]">
              {consultationData.length}
            </div>
            <div className="text-sm text-gray-600">Total Registros</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {consultationData.filter(r => r.estadoRecepc === 'UTIL').length}
            </div>
            <div className="text-sm text-gray-600">Útiles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {consultationData.filter(r => r.estadoRecepc === 'IRREPARABLE').length}
            </div>
            <div className="text-sm text-gray-600">Irreparables</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-500">
              {consultationData.filter(r => !r.estadoRecepc).length}
            </div>
            <div className="text-sm text-gray-600">Sin Recepción</div>
          </div>
        </div>
      </div>
    </div>
  );
}