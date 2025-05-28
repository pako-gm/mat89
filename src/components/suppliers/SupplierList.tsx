import { useState, useEffect } from "react";
import { Supplier } from "@/types";
import { getAllSuppliers, deleteSupplier } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2, User } from "lucide-react";
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
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const suppliersPerPage = 10;

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

  const totalPages = Math.ceil(filteredSuppliers.length / suppliersPerPage);
  const indexOfLastSupplier = currentPage * suppliersPerPage;
  const indexOfFirstSupplier = indexOfLastSupplier - suppliersPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstSupplier, indexOfLastSupplier);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, supplier: Supplier) => {
    e.stopPropagation();
    setSupplierToDelete(supplier);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    
    try {
      await deleteSupplier(supplierToDelete.id);
      
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor ha sido eliminado correctamente",
      });
      
      // Update the suppliers list without fetching again
      const updatedSuppliers = suppliers.filter(s => s.id !== supplierToDelete.id);
      setSuppliers(updatedSuppliers);
      setFilteredSuppliers(updatedSuppliers);
      
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el proveedor. Por favor, inténtelo de nuevo.",
      });
    }
    
    setSupplierToDelete(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, ciudad, teléfono o email..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10 h-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium w-[30%]">Nombre Empresa</TableHead>
              <TableHead className="font-medium w-[15%]">Ciudad</TableHead>
              <TableHead className="font-medium w-[15%]">Teléfono</TableHead>
              <TableHead className="font-medium w-[20%]">Email</TableHead>
              <TableHead className="font-medium w-[15%]">Contacto Principal</TableHead>
              <TableHead className="font-medium w-[5%]"></TableHead>
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
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell 
                    className="font-medium cursor-pointer flex items-center"
                    onClick={() => onViewDetails(supplier)}
                  >
                    <span>{supplier.name}</span>
                    {supplier.isExternal && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-50 text-[#FF0000] font-medium">
                        SI
                      </span>
                    )}
                    {supplier.isExternal === false && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-green-50 text-[#008000] font-medium">
                        NO
                      </span>
                    )}
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => onViewDetails(supplier)}
                  >
                    {supplier.city || "--"}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => onViewDetails(supplier)}
                  >
                    {supplier.phone ? (
                      <div className="flex items-center">
                        <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                        <span>{supplier.phone}</span>
                      </div>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => onViewDetails(supplier)}
                  >
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
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => onViewDetails(supplier)}
                  >
                    {supplier.contactPerson ? (
                      <div className="flex items-center">
                        <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                        <span>{supplier.contactPerson}</span>
                      </div>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-[30px] w-[30px] p-0 text-[#FF0000] hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                      onClick={(e) => handleDeleteClick(e, supplier)}
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
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

      <AlertDialog open={!!supplierToDelete} onOpenChange={() => setSupplierToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              ¿Está seguro que desea eliminar este contacto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-200 text-gray-800 hover:bg-gray-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}