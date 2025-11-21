import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface NCRequiredModalProps {
  open: boolean;
  currentNCValue?: string;
  onSubmit: (ncNumber: string) => void;
  onCancel: () => void;
}

export default function NCRequiredModal({
  open,
  currentNCValue = "",
  onSubmit,
  onCancel
}: NCRequiredModalProps) {
  const [ncNumber, setNcNumber] = useState(currentNCValue);
  const [error, setError] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
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
        case 'Escape':
          event.preventDefault();
          handleCancel();
          break;
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

  const handleCancel = () => {
    setNcNumber("");
    setError(false);
    onCancel();
  };

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
            ref={submitButtonRef}
            onClick={handleSubmit}
            disabled={!ncNumber.trim()}
            className="flex-1 bg-[#91268F] hover:bg-[#7A1F79] text-white focus:ring-2 focus:ring-[#91268F] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
