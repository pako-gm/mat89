import { Badge } from "@/components/ui/badge";
import { Order } from "@/types";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface OrderDetailsAccordionProps {
  order: Order | null;
  isLoading?: boolean;
  searchText?: string;
}

export default function OrderDetailsAccordion({
  order,
  isLoading,
  searchText = ''
}: OrderDetailsAccordionProps) {
  // Estado para controlar qué líneas están expandidas (para ver sus recepciones)
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  // Filtrar líneas del pedido según búsqueda
  const filteredOrderLines = order?.orderLines.filter(line => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();

    return (
      line.registration.toLowerCase().includes(searchLower) ||
      line.partDescription.toLowerCase().includes(searchLower) ||
      line.serialNumber.toLowerCase().includes(searchLower)
    );
  }) || [];

  const toggleLineExpansion = (lineId: string) => {
    setExpandedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) {
        newSet.delete(lineId);
      } else {
        newSet.add(lineId);
      }
      return newSet;
    });
  };

  const getReceptionStatusColor = (status: string) => {
    switch (status) {
      case 'UTIL': return 'bg-green-100 text-green-800';
      case 'IRREPARABLE': return 'bg-red-100 text-red-800';
      case 'REPARABLE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="text-center text-gray-500">Cargando información del pedido...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="text-center text-red-500">No se encontró el pedido</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg space-y-6">
      {/* SECCIÓN 1: INFORMACIÓN GENERAL DEL PEDIDO */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-base font-semibold mb-3 text-slate-700">
          Información General - Pedido: {order.orderNumber}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Almacén:</span>
            <p className="font-medium">{order.warehouse}</p>
          </div>
          <div>
            <span className="text-gray-500">Proveedor:</span>
            <p className="font-medium">{order.supplierName}</p>
          </div>
          <div>
            <span className="text-gray-500">Vehículo:</span>
            <p className="font-medium">{order.vehicle}</p>
          </div>
          <div>
            <span className="text-gray-500">Garantía:</span>
            <p className="font-medium">{order.warranty ? 'Sí' : 'No'}</p>
          </div>
          <div>
            <span className="text-gray-500">F. Desmonte:</span>
            <p className="font-medium">{formatDate(order.dismantleDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">F. Envío:</span>
            <p className="font-medium">{formatDate(order.shipmentDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Estado:</span>
            <Badge className={order.estadoPedido === 'COMPLETADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {order.estadoPedido}
            </Badge>
          </div>
          {order.nonConformityReport && (
            <div className="col-span-full">
              <span className="text-gray-500">Información NC:</span>
              <p className="font-medium">{order.nonConformityReport}</p>
            </div>
          )}
          {order.declaredDamage && (
            <div className="col-span-full">
              <span className="text-gray-500">Avería Declarada:</span>
              <p className="font-medium">{order.declaredDamage}</p>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: LÍNEAS DEL PEDIDO CON SUB-FILAS DE RECEPCIONES */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-base font-semibold mb-3 text-slate-700">
          Líneas del Pedido ({filteredOrderLines.length}{searchText ? ` de ${order.orderLines.length}` : ''})
        </h3>

        {filteredOrderLines.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-4">
            No se encontraron líneas que coincidan con la búsqueda
          </p>
        ) : (
          <div className="space-y-2">
            {filteredOrderLines.map((line) => {
              const isExpanded = expandedLines.has(line.id);
              const hasReceptions = line.receptions && line.receptions.length > 0;
              const receptionCount = line.receptions?.length || 0;

              return (
                <div key={line.id} className="border rounded-lg overflow-hidden">
                  {/* FILA PRINCIPAL DE LA LÍNEA */}
                  <div className="bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                    <div className="grid grid-cols-12 gap-2 items-center text-sm">
                      {/* Botón expandir */}
                      <div className="col-span-1 flex items-center justify-center">
                        <button
                          onClick={() => toggleLineExpansion(line.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          aria-label={isExpanded ? "Contraer recepciones" : "Expandir recepciones"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      </div>

                      {/* Matrícula 89 */}
                      <div className="col-span-2">
                        <span className="font-mono text-xs text-gray-500">Mat. 89</span>
                        <p className="font-medium">{line.registration}</p>
                      </div>

                      {/* Descripción */}
                      <div className="col-span-3">
                        <span className="text-xs text-gray-500">Descripción</span>
                        <p className="font-medium truncate" title={line.partDescription}>
                          {line.partDescription}
                        </p>
                      </div>

                      {/* Cantidad */}
                      <div className="col-span-1 text-center">
                        <span className="text-xs text-gray-500 block">Cant.</span>
                        <p className="font-medium">{line.quantity}</p>
                      </div>

                      {/* Número Serie */}
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500">N. Serie</span>
                        <p className="font-mono text-sm">{line.serialNumber}</p>
                      </div>

                      {/* Estado */}
                      <div className="col-span-3">
                        <span className="text-xs text-gray-500 block mb-1">Estado</span>
                        <Badge className={line.estadoCompletado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {line.estadoCompletado ? '✓ Completo' : `Pendiente (${line.totalReceived || 0}/${line.quantity})`}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* SUB-FILAS: RECEPCIONES */}
                  {isExpanded && (
                    <div className="bg-white p-4 border-t">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Recepciones ({receptionCount})
                      </h4>

                      {hasReceptions ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b">
                                <th className="text-left p-2 font-medium text-gray-600">Fecha Recepción</th>
                                <th className="text-center p-2 font-medium text-gray-600">Cant. Rec.</th>
                                <th className="text-left p-2 font-medium text-gray-600">Núm. Serie</th>
                                <th className="text-left p-2 font-medium text-gray-600">Estado</th>
                                <th className="text-left p-2 font-medium text-gray-600">Observaciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {line.receptions!.map((reception) => (
                                <tr key={reception.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                  <td className="p-2">{formatDate(reception.fechaRecepcion)}</td>
                                  <td className="p-2 text-center">{reception.nRec}</td>
                                  <td className="p-2 font-mono text-xs">{reception.nsRec || '--'}</td>
                                  <td className="p-2">
                                    <Badge className={getReceptionStatusColor(reception.estadoRecepcion)}>
                                      {reception.estadoRecepcion}
                                    </Badge>
                                  </td>
                                  <td className="p-2 max-w-[200px] truncate" title={reception.observaciones || ''}>
                                    {reception.observaciones || '--'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Sin recepciones registradas</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
