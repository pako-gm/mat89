import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Edit2, Trash2, X, MessageCircle, Clock, User } from "lucide-react";
import { filterManualChangeHistory, formatNewCommentStyle, debugComments, formatDateToDDMMYYYY } from "@/lib/utils";

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
  // MEJORADO: Agregar logging para diagnóstico y manejar comentarios
  const manualChangeHistory = (() => {
    console.log('=== DIAGNÓSTICO DE COMENTARIOS ===');
    console.log('Pedido ID:', order.id);
    console.log('Número de pedido:', order.orderNumber);
    console.log('Total changeHistory items:', order.changeHistory?.length || 0);
    
    if (order.changeHistory && order.changeHistory.length > 0) {
      console.log('ChangeHistory completo:', order.changeHistory);
      
      // Usar función de debug
      const filtered = debugComments(order.changeHistory);
      
      // Ordenar cronológicamente (más reciente primero)
      const sorted = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      console.log('Comentarios finales ordenados:', sorted.length);
      return sorted;
    } else {
      console.log('No hay changeHistory en el pedido');
      return [];
    }
  })();

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
                <div>Fecha Envío: {formatDateToDDMMYYYY(order.shipmentDate)}</div>
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
                      <div>{formatDateToDDMMYYYY(order.dismantleDate)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-500">Fecha Envío</div>
                      <div>{formatDateToDDMMYYYY(order.shipmentDate)}</div>
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

              {/* MEJORADO: Sección de comentarios con mejor diseño y diagnóstico */}
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-5 w-5 text-[#91268F]" />
                  <h3 className="text-lg font-medium">
                    Histórico de Comentarios
                    {manualChangeHistory.length > 0 && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({manualChangeHistory.length} {manualChangeHistory.length === 1 ? 'comentario' : 'comentarios'})
                      </span>
                    )}
                  </h3>
                </div>
                
                <div className="border rounded-md bg-gray-50 overflow-hidden">
                  {manualChangeHistory.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {manualChangeHistory.map((change, index) => (
                        <div key={change.id || index} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-[#91268F] rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {change.user || 'Usuario desconocido'}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDateToDDMMYYYY(change.date)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-800 bg-gray-100 rounded-lg p-3 border-l-4 border-l-[#91268F]">
                                {change.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 mb-1">
                        No hay comentarios registrados para este pedido.
                      </p>
                      <p className="text-xs text-gray-400">
                        Los comentarios aparecerán aquí cuando los usuarios los agreguen en el formulario de edición.
                      </p>
                      
                      {/* DEBUG: Información adicional para diagnóstico */}
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-left">
                        <p className="text-xs text-yellow-800 font-medium mb-2">Información de diagnóstico:</p>
                        <p className="text-xs text-yellow-700">
                          • Total items en changeHistory: {order.changeHistory?.length || 0}
                        </p>
                        <p className="text-xs text-yellow-700">
                          • Comentarios después del filtro: {manualChangeHistory.length}
                        </p>
                        <p className="text-xs text-yellow-700">
                          • Pedido ID: {order.id}
                        </p>
                        {order.changeHistory && order.changeHistory.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-yellow-800 cursor-pointer">Ver changeHistory raw</summary>
                            <pre className="text-xs text-yellow-700 mt-1 overflow-auto max-h-32">
                              {JSON.stringify(order.changeHistory, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
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