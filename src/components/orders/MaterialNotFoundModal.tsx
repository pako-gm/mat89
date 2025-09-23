import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface MaterialNotFoundModalProps {
  open: boolean;
  registration: string;
  onClose: () => void;
  onCreateMaterial: () => void;
  onCancel: () => void; // Nueva prop para manejar la cancelación
}

export default function MaterialNotFoundModal({ 
  open, 
  registration, 
  onClose, 
  onCreateMaterial,
  onCancel
}: MaterialNotFoundModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Manejar focus inicial cuando se abre el modal
  useEffect(() => {
    if (open && cancelButtonRef.current) {
      // Dar focus al botón cancelar por defecto para una acción conservadora
      setTimeout(() => {
        cancelButtonRef.current?.focus();
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
          handleCancel();
          break;
        case 'Enter':
          event.preventDefault();
          // Si el focus está en el botón crear, ejecutar crear
          if (document.activeElement === createButtonRef.current) {
            handleCreateMaterial();
          } else {
            // Por defecto, cancelar (acción conservadora)
            handleCancel();
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

  const handleCancel = () => {
    // Llamar al callback de cancelación para limpiar el campo
    onCancel();
    // Cerrar el modal
    onClose();
  };

  const handleCreateMaterial = () => {
    // Llamar al callback de crear material
    onCreateMaterial();
    // El modal se cerrará automáticamente en el callback
  };

  // Prevenir cierre del modal al hacer clic fuera
  const handleOpenChange = (isOpen: boolean) => {
    // Solo permitir cerrar explícitamente con los botones
    if (!isOpen) {
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md focus:outline-none"
        // Prevenir cierre al hacer clic fuera
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCancel();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Material no encontrado
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            La matrícula <strong className="text-gray-900 font-semibold">{registration}</strong> no existe en la base de datos de materiales.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            ¿Desea dar de alta esta matricula en el sistema? 
            Pulse el botón "Dar de Alta" para crear un nuevo registro.
          </p>
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
            ref={createButtonRef}
            onClick={handleCreateMaterial}
            className="flex-1 bg-[#91268F] hover:bg-[#7A1F79] text-white focus:ring-2 focus:ring-[#91268F] focus:ring-offset-2"
            type="button"
          >
            Dar de alta
          </Button>
        </DialogFooter>
        
        {/* Indicador visual de acciones de teclado */}
        <div className="text-xs text-gray-500 text-center pb-2">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> para cancelar • 
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs ml-1">Tab</kbd> para navegar
        </div>
      </DialogContent>
    </Dialog>
  );
}