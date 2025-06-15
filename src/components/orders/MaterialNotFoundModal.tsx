import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface MaterialNotFoundModalProps {
  open: boolean;
  registration: string;
  onClose: () => void;
  onCreateMaterial: () => void;
}

export default function MaterialNotFoundModal({ 
  open, 
  registration, 
  onClose, 
  onCreateMaterial 
}: MaterialNotFoundModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Material no encontrado
          </DialogTitle>
          <DialogDescription className="text-base">
            La matrícula <strong>{registration}</strong> no existe en la base de datos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600">
            ¿Desea dar de alta este material en el sistema?
          </p>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={onCreateMaterial}
            className="flex-1 bg-[#91268F] hover:bg-[#7A1F79] text-white"
          >
            Dar de alta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}