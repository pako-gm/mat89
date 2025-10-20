import { useState, useEffect } from "react";
import { Supplier } from "@/types";
import { getAllSuppliers } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User } from "lucide-react";
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

interface SupplierListProps {
  onViewDetails: (supplier: Supplier) => void;
  refreshTrigger: number;
}

export default function SupplierList({ onViewDetails, refreshTrigger }: SupplierListProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const suppliersPerPage = 5;

  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoading(true);
      try {
        const data = await getAllSuppliers();
        setSuppliers(data);
        setFilteredSuppliers(data);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los proveedores. Por favor, inténtelo de nuevo.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSuppliers();
  }, [toast, refreshTrigger]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (supplier.city && supplier.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (supplier.phone && supplier.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
      setCurrentPage(1);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchQuery, suppliers]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearFilter = () => {
    setSearchQuery("");
    setFilteredSuppliers(suppliers);
    // Mantener el foco en el campo de búsqueda
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const totalPages = Math.ceil(filteredSuppliers.length / suppliersPerPage);
  const indexOfLastSupplier = currentPage * suppliersPerPage;
  const indexOfFirstSupplier = indexOfLastSupplier - suppliersPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstSupplier, indexOfLastSupplier);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, ciudad, teléfono o email..."
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
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium w-[25%]">Nombre Empresa</TableHead>
              <TableHead className="font-medium w-[15%]">Ciudad</TableHead>
              <TableHead className="font-medium w-[15%]">Teléfono</TableHead>
              <TableHead className="font-medium w-[20%]">Email</TableHead>
              <TableHead className="font-medium w-[15%]">Contacto Principal</TableHead>
              <TableHead className="font-medium w-[10%]">Prov. Externo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#91268F]"></div>
                    <span className="ml-2">Cargando proveedores...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : currentSuppliers.length > 0 ? (
              currentSuppliers.map((supplier) => (
                <TableRow 
                  key={supplier.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(supplier)}
                >
                  <TableCell className="font-medium">
                    <span>{supplier.name}</span>
                  </TableCell>
                  <TableCell>
                    {supplier.city || "--"}
                  </TableCell>
                  <TableCell>
                    {supplier.phone ? (
                      <div className="flex items-center">
                        <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                        <span>{supplier.phone}</span>
                      </div>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.email ? (
                      <div className="flex items-center">
                        <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                        <span className="text-blue-600 hover:underline">
                          {supplier.email}
                        </span>
                      </div>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.contactPerson ? (
                      <div className="flex items-center">
                        <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                        <span>{supplier.contactPerson}</span>
                      </div>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs font-medium ${
                      supplier.isExternal 
                        ? 'text-[#FF0000] bg-red-50 border-red-200' 
                        : 'text-[#008000] bg-green-50 border-green-200'
                    }`}>
                      {supplier.isExternal ? 'Sí' : 'No'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {searchQuery
                    ? "No se encontraron proveedores que coincidan con la búsqueda"
                    : "No hay proveedores registrados. Haga clic en 'Nuevo Proveedor' para agregar uno."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredSuppliers.length > suppliersPerPage && (
        <div className="flex justify-center items-center py-4 border-t border-gray-200">
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
    </div>
  );
}