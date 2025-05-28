import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Supplier } from "@/types";
import { Edit2, X, Mail, Phone, MapPin, User, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";

interface SupplierDetailsProps {
  supplier: Supplier;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function SupplierDetails({ 
  supplier, 
  open, 
  onClose, 
  onEdit 
}: SupplierDetailsProps) {
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
      <DialogContent className="max-w-[70vw]">
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
        
        <div className="p-1">
          <div className="border rounded-lg bg-gray-50 overflow-hidden">
            <div className="p-6 bg-gray-900 text-white">
              <h2 className="text-2xl font-semibold">{supplier.name}</h2>
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
                      <div>{supplier.isExternal ? "Externo" : "Interno"}</div>
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