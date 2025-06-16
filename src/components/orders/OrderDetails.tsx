import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Edit2, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { filterManualChangeHistory, formatChangeHistoryDate, formatUserName } from "@/lib/utils";

interface OrderDetailsProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function OrderDetails({ 
  order, 
  open, 
  onClose, 
  onEdit,
  onDelete
}: OrderDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "--";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (error) {
      return dateString;
    }
  };

  // Filtrar solo comentarios manuales
  const manualChangeHistory = filterManualChangeHistory(order.changeHistory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">Detalles del Pedido</DialogTitle>
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
              <h2 className="text-2xl font-semibold">{order.orderNumber}</h2>
              <div className="flex gap-4 mt-2 text-sm text-gray-300">
                <div>Almacén: {order.warehouse}</div>
                <div>Vehículo: {order.vehicle}</div>
                <div>Fecha Envío: {formatDate(order.shipmentDate)}</div>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Información del Pedido</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-medium text-sm text-gray-500">Almacén</div>
                      <div>{order.warehouse}</div>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-500">Vehículo</div>
                      <div>{order.vehicle}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-medium text-sm text-gray-500">Fecha Desmonte</div>
                      <div>{formatDate(order.dismantleDate)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-500">Fecha Envío</div>
                      <div>{formatDate(order.shipmentDate)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-sm text-gray-500">Proveedor</div>
                    <div>{order.supplierName}</div>
                  </div>
                  
                  <div className="flex items-start">
                    <div>
                      <div className="font-medium text-sm text-gray-500">Garantía</div>
                      <div>{order.warranty ? "Sí" : "No"}</div>
                    </div>
                    {order.warranty && (
                      <div className="ml-8">
                        <div className="font-medium text-sm text-gray-500">Informe NC</div>
                        <div>{order.nonConformityReport || "--"}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Avería Declarada</h3>
                <div className="bg-white border rounded-md p-3 min-h-[100px]">
                  {order.declaredDamage || "No hay avería declarada."}
                </div>
                
                {order.shipmentDocumentation?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Documentación</h3>
                    <div className="space-y-1">
                      {order.shipmentDocumentation.map((doc, index) => (
                        <div key={index} className="flex items-center bg-white p-1.5 border rounded text-sm">
                          <span>{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {manualChangeHistory.length > 0 && (
                <div className="col-span-2">
                  <h3 className="text-lg font-medium mb-3">
                    Comentarios del Usuario
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({manualChangeHistory.length} {manualChangeHistory.length === 1 ? 'comentario' : 'comentarios'})
                    </span>
                  </h3>
                  <div className="border rounded-md bg-gray-50 p-3 max-h-[200px] overflow-y-auto">
                    {manualChangeHistory.map((change, index) => (
                      <div key={index} className="py-2 border-b last:border-0">
                        <div className="flex justify-between items-start text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            {formatChangeHistoryDate(change.date)}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {formatUserName(change.user)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-800 leading-relaxed">
                          {change.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {manualChangeHistory.length === 0 && (
                <div className="col-span-2">
                  <h3 className="text-lg font-medium mb-3">Comentarios del Usuario</h3>
                  <div className="border rounded-md bg-gray-50 p-4 text-center">
                    <p className="text-sm text-gray-500">
                      No hay comentarios manuales registrados para este pedido.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="col-span-2">
                <h3 className="text-lg font-medium mb-3">Líneas de Pedido</h3>
                <Card>
                  <CardContent className="p-2">
                    <div className="grid grid-cols-[2fr,4fr,1fr,2fr] gap-2 text-xs font-medium text-gray-500 p-2">
                      <div>Matrícula 89</div>
                      <div>Descripción Pieza</div>
                      <div>Cant.</div>
                      <div>Num. Serie</div>
                    </div>
                    {order.orderLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-[2fr,4fr,1fr,2fr] gap-2 py-2 px-2 text-sm border-t">
                        <div>{line.registration}</div>
                        <div>{line.partDescription}</div>
                        <div>{line.quantity}</div>
                        <div>{line.serialNumber}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}