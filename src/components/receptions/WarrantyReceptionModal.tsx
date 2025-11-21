import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertCircle } from "lucide-react";

interface WarrantyReceptionModalProps {
  open: boolean;
  onConfirm: (acceptedByProvider: boolean, rejectionReason?: string) => void;
  onCancel: () => void;
}

export default function WarrantyReceptionModal({
  open,
  onConfirm,
  onCancel
}: WarrantyReceptionModalProps) {
  const [warrantyAccepted, setWarrantyAccepted] = useState(true); // Default: accepted
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setWarrantyAccepted(true);
      setRejectionReason("");
      setError(false);
      // Focus confirm button when modal opens
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Focus textarea when warranty is rejected
  useEffect(() => {
    if (open && !warrantyAccepted) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [warrantyAccepted, open]);

  // Manejar teclas
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleCancel();
          break;
        case 'Enter':
          // Only submit with Enter if not in textarea
          if (document.activeElement !== textareaRef.current) {
            event.preventDefault();
            handleConfirm();
          }
          break;
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [open, warrantyAccepted, rejectionReason]);

  const handleCancel = () => {
    setWarrantyAccepted(true);
    setRejectionReason("");
    setError(false);
    onCancel();
  };

  const handleConfirm = () => {
    // If warranty is rejected, rejection reason is required
    if (!warrantyAccepted && !rejectionReason.trim()) {
      setError(true);
      textareaRef.current?.focus();
      return;
    }

    setError(false);
    onConfirm(warrantyAccepted, warrantyAccepted ? undefined : rejectionReason.trim());
  };

  const handleRejectionReasonChange = (value: string) => {
    setRejectionReason(value);
    if (error && value.trim()) {
      setError(false);
    }
  };

  // Prevenir cierre del modal al hacer clic fuera
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md focus:outline-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCancel();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Material en garantía de reparación
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Este material fue enviado en garantía de reparación. Comprueba aceptación o rechazo con la documentación recibida.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> Guarda una copia escaneada de la documentación en OneDrive.
            </p>
          </div>

          <div className="space-y-4">
            {/* Warranty acceptance switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex-1">
                <Label htmlFor="warranty-switch" className="text-sm font-semibold cursor-pointer">
                  ¿Acepta garantía el proveedor?
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  {warrantyAccepted
                    ? "El proveedor ha aceptado la garantía de reparación"
                    : "El proveedor ha rechazado la garantía de reparación"}
                </p>
              </div>
              <Switch
                id="warranty-switch"
                checked={warrantyAccepted}
                onCheckedChange={setWarrantyAccepted}
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            {/* Rejection reason - only shown if warranty is rejected */}
            {!warrantyAccepted && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason" className="text-sm font-medium text-red-700">
                  Motivo del rechazo <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  ref={textareaRef}
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => handleRejectionReasonChange(e.target.value)}
                  placeholder="Explica el motivo por el cual el proveedor rechaza la garantía..."
                  className={`min-h-[100px] ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
                  maxLength={500}
                />
                {error && (
                  <p className="text-xs text-red-600 mt-1">
                    El motivo del rechazo es obligatorio
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {rejectionReason.length}/500 caracteres
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            ref={cancelButtonRef}
            variant="outline"
            onClick={handleCancel}
            className="flex-1 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            type="button"
          >
            Cancelar
          </Button>
          <Button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            className="flex-1 bg-[#91268F] hover:bg-[#7A1F79] text-white focus:ring-2 focus:ring-[#91268F] focus:ring-offset-2"
            type="button"
          >
            Confirmar
          </Button>
        </DialogFooter>

        {/* Indicador visual de acciones de teclado */}
        <div className="text-xs text-gray-500 text-center pb-2">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> para cancelar •
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs ml-1">Enter</kbd> para confirmar
        </div>
      </DialogContent>
    </Dialog>
  );
}
