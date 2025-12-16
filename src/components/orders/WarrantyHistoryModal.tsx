import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WarrantyHistoryInfo } from "@/types";
import { AlertCircle, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface WarrantyHistoryModalProps {
  open: boolean;
  onClose: () => void;
  onContinue?: () => void;
  historyData: WarrantyHistoryInfo[];
  canProceed: boolean;
  blockingReason: string | null;
}

export default function WarrantyHistoryModal({
  open,
  onClose,
  onContinue,
  historyData,
  canProceed,
  blockingReason
}: WarrantyHistoryModalProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const getWarrantyStatusBadge = (warrantyAccepted: boolean | null) => {
    if (warrantyAccepted === null) return <span className="text-gray-500">Sin datos</span>;
    if (warrantyAccepted) {
      return (
        <span className="inline-flex items-center gap-1 text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          Aceptada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <XCircle className="w-4 h-4" />
        Rechazada
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {canProceed ? (
              <>
                <AlertCircle className="w-6 h-6 text-blue-500" />
                Historial de Garantías - Información
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-red-500" />
                Historial de Garantías - BLOQUEADO
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Blocking Reason Alert */}
          {!canProceed && blockingReason && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-red-900 mb-1">No se puede enviar con garantía</p>
                  <p className="text-red-700">{blockingReason}</p>
                  <p className="text-sm text-red-600 mt-2">
                    Debe resolver la situación pendiente antes de poder enviar este material nuevamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Message when can proceed */}
          {canProceed && historyData.length > 0 && (
            <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Información de envíos anteriores</p>
                  <p className="text-blue-700">
                    Este material ha sido enviado previamente en garantía. Revisa el historial a continuación.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* History Tables - One per Material */}
          {historyData.map((materialHistory, idx) => (
            <div key={idx} className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Material: <span className="text-blue-600">{materialHistory.materialRegistration}</span>
                {!materialHistory.canSendWithWarranty && (
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-sm rounded-md">
                    BLOQUEADO
                  </span>
                )}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                        Nº Pedido
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                        Almacén
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                        Fecha Envío
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                        Fecha Recepción
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                        Estado
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                        Garantía
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                        Motivo Rechazo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialHistory.previousOrders.map((prevOrder, orderIdx) => (
                      <tr
                        key={orderIdx}
                        className={`
                          ${prevOrder.isPendingReception ? 'bg-yellow-50' : ''}
                          ${prevOrder.isIrreparable ? 'bg-red-50' : ''}
                          ${!prevOrder.isPendingReception && !prevOrder.isIrreparable ? 'bg-white' : ''}
                        `}
                      >
                        <td className="border border-gray-300 px-3 py-2 text-sm font-mono">
                          {prevOrder.orderNumber}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {prevOrder.warehouse.startsWith('ALM') ? prevOrder.warehouse : `ALM${prevOrder.warehouse}`}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formatDate(prevOrder.sendDate)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {prevOrder.isPendingReception ? (
                            <span className="inline-flex items-center gap-1 text-yellow-700 font-semibold">
                              <Clock className="w-4 h-4" />
                              Pendiente
                            </span>
                          ) : (
                            formatDate(prevOrder.receptionDate)
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {prevOrder.isIrreparable ? (
                            <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                              <XCircle className="w-4 h-4" />
                              IRREPARABLE
                            </span>
                          ) : prevOrder.isPendingReception ? (
                            <span className="text-gray-500">-</span>
                          ) : (
                            <span className="text-green-700">Normal</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {prevOrder.isPendingReception ? (
                            <span className="text-gray-500">-</span>
                          ) : (
                            getWarrantyStatusBadge(prevOrder.warrantyAccepted)
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {prevOrder.rejectionReason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {canProceed && onContinue ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={onContinue}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continuar con Garantía
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
              >
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
