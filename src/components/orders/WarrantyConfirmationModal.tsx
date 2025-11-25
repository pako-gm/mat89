import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
// import { DuplicateMaterialInfo } from "@/lib/data"; // TODO: Only available in GARANTIAS-REPARACION branch

// Temporary type definition for main branch
interface DuplicateMaterialInfo {
  matricula89: string;
  descripcion: string;
  numPedido: string;
  fechaEnvio: string;
  fechaRecepcion: string;
  pedidoId: string;
}

interface WarrantyConfirmationModalProps {
  open: boolean;
  duplicateMaterials: DuplicateMaterialInfo[];
  onAccept: () => void;
  onDecline: () => void;
}

export default function WarrantyConfirmationModal({
  open,
  duplicateMaterials,
  onAccept,
  onDecline
}: WarrantyConfirmationModalProps) {
  const declineButtonRef = useRef<HTMLButtonElement>(null);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  // Manejar focus inicial cuando se abre el modal
  useEffect(() => {
    if (open && acceptButtonRef.current) {
      // Dar focus al botón aceptar como acción principal
      setTimeout(() => {
        acceptButtonRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Manejar teclas de escape y enter
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleDecline();
          break;
        case 'Enter':
          event.preventDefault();
          // Si el focus está en el botón rechazar, ejecutar rechazar
          if (document.activeElement === declineButtonRef.current) {
            handleDecline();
          } else {
            // Por defecto, aceptar (acción principal)
            handleAccept();
          }
          break;
        case 'Tab':
          // Permitir navegación normal con Tab
          break;
        default:
          // Prevenir otras teclas para mantener focus en el modal
          if (event.key.length === 1) {
            event.preventDefault();
          }
          break;
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const handleAccept = () => {
    onAccept();
  };

  const handleDecline = () => {
    onDecline();
  };

  // Prevenir cierre del modal al hacer clic fuera
  const handleOpenChange = (isOpen: boolean) => {
    // Solo permitir cerrar explícitamente con los botones
    if (!isOpen) {
      handleDecline();
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl focus:outline-none"
        // Prevenir cierre al hacer clic fuera
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleDecline();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Envio de Material duplicado detectado
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {duplicateMaterials.length === 1
              ? 'Se ha detectado que este material ya fue enviado anteriormente al mismo proveedor:'
              : `Se han detectado ${duplicateMaterials.length} materiales que ya fueron enviados anteriormente al mismo proveedor:`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
            <div className="space-y-3">
              {duplicateMaterials.map((material, index) => (
                <div key={index} className="text-sm">
                  <div className="font-semibold text-gray-900 mb-1">
                    Material: {material.matricula89}
                    {material.descripcion && (
                      <span className="font-normal text-gray-600"> - {material.descripcion}</span>
                    )}
                  </div>
                  <div className="text-gray-700 pl-4">
                    <div>Pedido anterior: <strong>{material.numPedido}</strong></div>
                    <div>Fecha de envío: <strong>{formatDate(material.fechaEnvio)}</strong></div>
                    <div>Fecha de recepción: <strong>{formatDate(material.fechaRecepcion)}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            Según los datos registrados, este material ha sido recepcionado hace menos de un año.
          </p>
          <p className="text-sm font-semibold text-gray-900">
            ¿Deseas enviar este material en garantía de reparación?
          </p>
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            ref={declineButtonRef}
            variant="outline"
            onClick={handleDecline}
            className="flex-1 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            type="button"
          >
            No, enviar sin garantía
          </Button>
          <Button
            ref={acceptButtonRef}
            onClick={handleAccept}
            className="flex-1 bg-[#91268F] hover:bg-[#7A1F79] text-white focus:ring-2 focus:ring-[#91268F] focus:ring-offset-2"
            type="button"
          >
            Sí, es garantía
          </Button>
        </DialogFooter>

        {/* Indicador visual de acciones de teclado */}
        <div className="text-xs text-gray-500 text-center pb-2">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> para rechazar •
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs ml-1">Enter</kbd> para aceptar •
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs ml-1">Tab</kbd> para navegar
        </div>
      </DialogContent>
    </Dialog>
  );
}
