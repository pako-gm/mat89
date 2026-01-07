import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrintModalProps {
  open: boolean;
  onClose: () => void;
  htmlContent: string;
  title: string;
}

export default function PrintModal({ open, onClose, htmlContent, title }: PrintModalProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Set landscape orientation
      const style = printWindow.document.createElement('style');
      style.textContent = `
        @page {
          size: landscape;
          margin: 0.5in;
        }
        @media print {
          body {
            margin: 0;
            padding: 20px;
          }
        }
      `;
      printWindow.document.head.appendChild(style);
      
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header fijo */}
        <div className="px-6 pt-6 pb-4 border-b bg-white shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white px-6 min-h-0">
          <div
            className="py-4"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Footer fijo */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
          >
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}