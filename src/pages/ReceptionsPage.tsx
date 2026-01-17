import ReceptionManagement from "@/components/receptions/ReceptionManagement";

export default function ReceptionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-700">
            Recepción de Materiales
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Registro y seguimiento de materiales recibidos desde los diferentes Proveedores
          </p>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <ReceptionManagement />
      </div>
    </div>
  );
}
