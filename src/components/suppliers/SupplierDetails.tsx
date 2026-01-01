import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Supplier } from "@/types";
import { Edit2, X, Mail, Phone, MapPin, User, ExternalLink, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";

interface SupplierDetailsProps {
  supplier: Supplier;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SupplierDetails({
  supplier,
  open,
  onClose,
  onEdit,
  onDelete
}: SupplierDetailsProps) {
  const { isAdmin } = useUserProfile();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "--";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">Detalles del Proveedor</DialogTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={onDelete}
                      disabled={!isAdmin}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isAdmin && (
                  <TooltipContent>
                    <p>Solo los Administradores pueden eliminar un Proveedor</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>
        </DialogHeader>
        
        <div className="p-1 max-h-[80vh] overflow-y-auto">
          <div className="border rounded-lg bg-gray-50 overflow-hidden">
            <div className="p-6 bg-gray-900 text-white">
              <h2 className="text-2xl font-semibold">{supplier.name}</h2>
              <div className="flex gap-4 mt-2 text-sm text-gray-300">
                <div>Tipo: {supplier.isExternal ? "Externo" : "Interno"}</div>
                {supplier.city && <div>Ciudad: {supplier.city}</div>}
                {supplier.phone && <div>Teléfono: {supplier.phone}</div>}
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Información de Contacto</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Teléfono</div>
                      <div>{supplier.phone || "--"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Email</div>
                      <div>{supplier.email || "--"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <User className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Persona de Contacto</div>
                      <div>{supplier.contactPerson || "--"}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Dirección</h3>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div>{supplier.address || "--"}</div>
                    {(supplier.city || supplier.postalCode) && (
                      <div>
                        {supplier.postalCode && `${supplier.postalCode}, `}
                        {supplier.city}
                      </div>
                    )}
                    <div>{supplier.province || ""}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Información Adicional</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <ExternalLink className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Tipo Proveedor</div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs font-medium ${
                          supplier.isExternal 
                            ? 'text-[#FF0000] bg-red-50 border-red-200' 
                            : 'text-[#008000] bg-green-50 border-green-200'
                        }`}>
                          {supplier.isExternal ? 'Externo' : 'Interno'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Fecha Creación</div>
                      <div>{formatDate(supplier.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Última Actualización</div>
                      <div>{formatDate(supplier.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Notas</h3>
                <div className="bg-white border rounded-md p-3 min-h-[100px]">
                  {supplier.notes || "No hay notas disponibles para este proveedor."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}