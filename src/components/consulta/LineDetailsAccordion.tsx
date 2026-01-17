import { Badge } from "@/components/ui/badge";
import { ConsultaRecord } from "@/types";
import { formatDateToDDMMYYYY } from "@/lib/utils";

interface LineDetailsAccordionProps {
  lineId: string;
  allRecords: ConsultaRecord[]; // Todos los registros de la consulta
}

export default function LineDetailsAccordion({
  lineId,
  allRecords
}: LineDetailsAccordionProps) {
  // Filtrar todos los records (recepciones) de esta línea
  const lineRecords = allRecords.filter(record => record.lineaId === lineId);

  if (lineRecords.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500 italic text-center">
          No se encontraron datos para esta línea
        </p>
      </div>
    );
  }

  // Tomar el primer record para obtener datos de envío (son iguales para todos)
  const firstRecord = lineRecords[0];

  // Helper para color de badge de estado de recepción
  const getReceptionStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toUpperCase()) {
      case 'UTIL': return 'bg-green-500 text-white';
      case 'IRREPARABLE': return 'bg-red-500 text-white';
      case 'SIN RECEPCIÓN': return 'bg-blue-100 text-blue-800';
      case 'SIN ACTUACION': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      {/* SECCIÓN 1: DETALLES DE ENVÍO */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-3 text-slate-700">
          Detalles de Envío
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Almacén Envía:</span>
            <p className="font-medium">
              {firstRecord.almEnvia.toString().startsWith('ALM')
                ? firstRecord.almEnvia
                : `ALM${firstRecord.almEnvia}`}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Cantidad Enviada:</span>
            <p className="font-medium">{firstRecord.cantEnv}</p>
          </div>
          <div>
            <span className="text-gray-500">Número de Serie Enviado:</span>
            <p className="font-mono text-xs">{firstRecord.numSerieEnv || 'S/N'}</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: TABLA DE RECEPCIONES */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-3 text-slate-700">
          Recepciones ({lineRecords.filter(r => r.recepcionId).length})
        </h3>

        {lineRecords.filter(r => r.recepcionId).length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-2">
            Sin recepciones registradas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-2 font-medium text-gray-600">Fecha Recepción</th>
                  <th className="text-center p-2 font-medium text-gray-600">Cant. Rec.</th>
                  <th className="text-left p-2 font-medium text-gray-600">Núm. Serie</th>
                  <th className="text-left p-2 font-medium text-gray-600">Estado</th>
                  <th className="text-left p-2 font-medium text-gray-600 max-w-[200px]">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {lineRecords
                  .filter(record => record.recepcionId) // Solo recepciones reales
                  .map((record) => (
                    <tr key={record.recepcionId} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="p-2">{formatDateToDDMMYYYY(record.fechaRecepc)}</td>
                      <td className="p-2 text-center">{record.cantRec ?? '--'}</td>
                      <td className="p-2 font-mono text-xs">{record.numSerieRec || '--'}</td>
                      <td className="p-2">
                        <Badge className={getReceptionStatusColor(record.estadoRecepc)}>
                          {record.estadoRecepc || 'SIN RECEPCIÓN'}
                        </Badge>
                      </td>
                      <td className="p-2 max-w-[200px] truncate" title={record.observaciones || ''}>
                        {record.observaciones || '--'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
