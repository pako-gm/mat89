import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Material } from "@/types";
import { Edit2, X, Package, Factory, Calendar, Hash, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";

interface MaterialDetailsProps {
  material: Material;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MaterialDetails({ 
  material, 
  open, 
  onClose, 
  onEdit,
  onDelete
}: MaterialDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "--";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch (error) {
      return dateString;
    }
  };

  const formatUpdatedByAndDate = (dateString?: string, userEmail?: string) => {
    if (!dateString && !userEmail) return "--";
    const formattedDate = formatDate(dateString);
    const email = userEmail || "SISTEMA";
    return `${formattedDate} - ${email}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">Detalles del Material</DialogTitle>
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
              className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Eliminar</span>
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
        
        <div className="p-1 max-h-[80vh] overflow-y-auto">
          <div className="border rounded-lg bg-gray-50 overflow-hidden">
            <div className="p-6 bg-gray-900 text-white">
              <h2 className="text-2xl font-semibold">Mat. {material.registration}</h2>
              <div className="flex gap-4 mt-2 text-sm text-gray-300">
                <div>Descripción: {material.description}</div>
                {material.vehicleSeries && <div>Serie: {material.vehicleSeries}</div>}
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Información del Material</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Hash className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Matrícula 89</div>
                      <div className="font-mono text-lg">{material.registration}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Package className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Descripción</div>
                      <div>{material.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Factory className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Serie Vehículo</div>
                      <div>{material.vehicleSeries || "No especificada"}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Información del Sistema</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Fecha de Creación</div>
                      <div>{formatDate(material.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-gray-500">Última Actualización</div>
                      <div>{formatUpdatedByAndDate(material.updatedAt, material.updatedBy)}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-2">
                <h3 className="text-lg font-medium mb-3">Información Adicional</h3>
                <div className="bg-white border rounded-md p-3 min-h-[100px]">
                  {material.infoAdicional && material.infoAdicional.trim() ? (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {material.infoAdicional}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No hay información adicional disponible para este material.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}