import { useState, useEffect } from "react";
import { Material } from "@/types";
import { getAllMaterials } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus
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

interface MaterialListProps {
  onViewDetails: (material: Material) => void;
  onAddNew: () => void;
  refreshTrigger: number;
}

type SortField = 'registration' | 'description';
type SortOrder = 'asc' | 'desc' | null;

export default function MaterialList({ onViewDetails, onAddNew, refreshTrigger }: MaterialListProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('registration');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const { toast } = useToast();
  const materialsPerPage = 10;

  useEffect(() => {
    const fetchMaterials = async () => {
      setIsLoading(true);
      try {
        const data = await getAllMaterials();
        setMaterials(data);
        setFilteredMaterials(data);
      } catch (error) {
        console.error("Error fetching materials:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los materiales. Por favor, inténtelo de nuevo.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMaterials();
  }, [toast, refreshTrigger]);

  useEffect(() => {
    let filtered = materials;
    
    if (searchQuery) {
      filtered = materials.filter(
        (material) =>
          material.registration.toString().includes(searchQuery) ||
          material.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (material.vehicleSeries && material.vehicleSeries.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply sorting
    if (sortField && sortOrder) {
      filtered = filtered.sort((a, b) => {
        let valueA: string | number;
        let valueB: string | number;
        
        if (sortField === 'registration') {
          valueA = a.registration;
          valueB = b.registration;
        } else {
          valueA = a.description.toLowerCase();
          valueB = b.description.toLowerCase();
        }
        
        if (sortOrder === 'asc') {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
      });
    }
    
    setFilteredMaterials(filtered);
    setCurrentPage(1);
  }, [searchQuery, materials, sortField, sortOrder]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearFilter = () => {
    setSearchQuery("");
    setFilteredMaterials(materials);
    // Mantener el foco en el campo de búsqueda
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortOrder(null);
        setSortField('registration');
      } else {
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field || !sortOrder) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-gray-600" />
      : <ArrowDown className="h-4 w-4 text-gray-600" />;
  };

  const totalPages = Math.ceil(filteredMaterials.length / materialsPerPage);
  const indexOfLastMaterial = currentPage * materialsPerPage;
  const indexOfFirstMaterial = indexOfLastMaterial - materialsPerPage;
  const currentMaterials = filteredMaterials.slice(indexOfFirstMaterial, indexOfLastMaterial);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-4">
          <div className="relative w-1/2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por matrícula, descripción o serie..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 h-9 border-black"
            />
          </div>
          <Button
            variant="outline"
            className="h-9 border-black hover:bg-gray-50 transition-colors duration-200"
            onClick={clearFilter}
          >
            Borrar Filtro
          </Button>
          <Button
            onClick={onAddNew}
            className="bg-[#91268F] hover:bg-[#7A1F79] text-white h-9 ml-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Material
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-medium w-[25%]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('registration')}
                  className="h-auto p-0 font-medium text-gray-900 hover:bg-transparent flex items-center gap-1"
                >
                  Matrícula 89
                  {getSortIcon('registration')}
                </Button>
              </TableHead>
              <TableHead className="font-medium w-[45%]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort('description')}
                  className="h-auto p-0 font-medium text-gray-900 hover:bg-transparent flex items-center gap-1"
                >
                  Descripción
                  {getSortIcon('description')}
                </Button>
              </TableHead>
              <TableHead className="font-medium w-[30%]">Serie Vehículo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#91268F]"></div>
                    <span className="ml-2">Cargando materiales...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : currentMaterials.length > 0 ? (
              currentMaterials.map((material) => (
                <TableRow 
                  key={material.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(material)}
                >
                  <TableCell className="font-medium">
                    {material.registration}
                  </TableCell>
                  <TableCell>
                    {material.description}
                  </TableCell>
                  <TableCell>
                    {material.vehicleSeries || "--"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  {searchQuery
                    ? "No se encontraron materiales que coincidan con la búsqueda"
                    : "No hay materiales registrados. Haga clic en 'Nuevo Material' para agregar uno."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredMaterials.length > materialsPerPage && (
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