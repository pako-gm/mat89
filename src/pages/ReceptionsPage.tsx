import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Reception } from '@/types';
import { getReceptions } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ReceptionsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [filteredReceptions, setFilteredReceptions] = useState<Reception[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceptions = async () => {
      const data = await getReceptions();
      setReceptions(data);
      setFilteredReceptions(data);
    };
    fetchReceptions();
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (value) {
        const filtered = receptions.filter(
          (reception) =>
            reception.orderNumber.toLowerCase().includes(value.toLowerCase()) ||
            reception.supplier.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredReceptions(filtered);
      } else {
        setFilteredReceptions(receptions);
      }
    },
    [receptions]
  );

  const clearFilter = useCallback(() => {
    setSearchQuery('');
    setFilteredReceptions(receptions);
  }, [receptions]);

  const toggleRow = (orderId: string) => {
    setExpandedRow(expandedRow === orderId ? null : orderId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium text-left">
          Recepción de Materiales
        </h1>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por num. Pedido, Proveedor, Matrícula..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Button variant="outline" className="h-9" onClick={clearFilter}>
          Borrar Filtro
        </Button>
        <Button
          variant="outline"
          className="h-9"
          onClick={() => navigate('/pedidos')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver Atrás
        </Button>
      </div>

      <div className="rounded-md border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-base text-left">
              <TableHead className="font-medium w-[150px]">
                Num. Pedido
              </TableHead>
              <TableHead className="font-medium w-[150px]">
                Razón Social
              </TableHead>
              <TableHead className="font-medium w-[120px]">
                Alm. Envía
              </TableHead>
              <TableHead className="font-medium w-[120px]">F. Envío</TableHead>
              <TableHead className="font-medium w-[120px]">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReceptions.map((reception) => (
              <>
                <TableRow 
                  key={reception.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleRow(reception.id)}
                >
                  <TableCell className="flex items-center gap-2">
                    {expandedRow === reception.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                    {reception.orderNumber}
                  </TableCell>
                  <TableCell>{reception.supplier}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center rounded-md border bg-gray-50 px-2 py-1 text-xs">
                      {reception.warehouse}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(reception.shipmentDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs ${getStatusColor(
                        reception.status
                      )}`}
                    >
                      {reception.status}
                    </span>
                  </TableCell>
                </TableRow>
                {expandedRow === reception.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0 border-b">
                      <div className="bg-gray-50 p-4">
                        <div className="grid grid-cols-[2fr,3fr,1fr,2fr] gap-4 mb-2 text-sm font-medium text-gray-600">
                          <div>Matrícula 89</div>
                          <div>Descripción Pieza</div>
                          <div>Cant. Env.</div>
                          <div>Num. Serie</div>
                        </div>
                        {reception.orderLines.map((line, index) => (
                          <div 
                            key={line.id}
                            className="grid grid-cols-[2fr,3fr,1fr,2fr] gap-4 py-2 text-sm border-t border-gray-200 hover:bg-gray-100"
                          >
                            <div>{line.registration}</div>
                            <div>{line.partDescription}</div>
                            <div>{line.quantity}</div>
                            <div>{line.serialNumber}</div>
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
    </div>
  );
}