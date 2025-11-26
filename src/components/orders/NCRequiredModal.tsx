import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface NCRequiredModalProps {
  open: boolean;
  currentNCValue?: string;
  onSubmit: (ncNumber: string) => void;
  onNotOpened: () => void;
}

export default function NCRequiredModal({
  open,
  currentNCValue = "",
  onSubmit,
  onNotOpened
}: NCRequiredModalProps) {
  const [ncNumber, setNcNumber] = useState(currentNCValue);
  const [error, setError] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setNcNumber(currentNCValue);
      setError(false);
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open, currentNCValue]);

  // Manejar teclas
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          handleSubmit();
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
  }, [open, ncNumber]);

  const handleSubmit = () => {
    const trimmedNC = ncNumber.trim();

    if (!trimmedNC) {
      setError(true);
      inputRef.current?.focus();
      return;
    }

    // Optional: Validate NC format (INCM.20XX.XXX)
    const ncPattern = /^INCM\.\d{4}\.\d+$/i;
    if (!ncPattern.test(trimmedNC)) {
      setError(true);
      inputRef.current?.focus();
      return;
    }

    setError(false);
    onSubmit(trimmedNC.toUpperCase());
  };

  const handleNCChange = (value: string) => {
    setNcNumber(value.toUpperCase());
    if (error && value.trim()) {
      setError(false);
    }
  };

  const handleNotOpened = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmNotOpened = () => {
    setShowConfirmDialog(false);
    onNotOpened();
  };

  // Prevenir cierre del modal - el usuario debe confirmar
  const handleOpenChange = () => {
    // No permitir cerrar el modal - el usuario debe introducir NC
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md focus:outline-none"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Número de NC requerido
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              Material enviado en garantía — debes incluir el número de No Conformidad correspondiente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="nc-input" className="text-sm font-medium">
                Informe No Conformidad
              </Label>
              <Input
                ref={inputRef}
                id="nc-input"
                value={ncNumber}
                onChange={(e) => handleNCChange(e.target.value)}
                placeholder="INCM.20XX.XXX"
                className={`${error ? 'border-red-500 focus:ring-red-500' : ''}`}
                type="text"
              />
              {error && (
                <p className="text-xs text-red-600 mt-1">
                  Debe introducir un número de NC válido (formato: INCM.20XX.XXX)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Formato requerido: INCM.YYYY.XXX (ejemplo: INCM.2025.001)
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleNotOpened}
              className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50 focus:ring-2 focus:ring-amber-300"
              type="button"
            >
              No Abierta
            </Button>
            <Button
              ref={submitButtonRef}
              onClick={handleSubmit}
              disabled={!ncNumber.trim()}
              className="flex-1 bg-[#91268F] hover:bg-[#7A1F79] text-white focus:ring-2 focus:ring-[#91268F] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              Confirmar
            </Button>
          </DialogFooter>

          <div className="text-xs text-gray-500 text-center pb-2">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> para confirmar
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Se va a Cancelar el Pedido
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-base">
              <p>
                Si la No Conformidad aún no ha sido abierta, el pedido actual será eliminado automáticamente.
              </p>
              <p className="font-semibold text-gray-900">
                Deberás crear el pedido nuevamente una vez dispongas del número de NC.
              </p>
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                <strong>Importante:</strong> Esta acción no se puede deshacer. Asegúrate de no tener información importante sin guardar en el pedido.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmNotOpened}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Confirmar y Borrar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
