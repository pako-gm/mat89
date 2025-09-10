import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-md bg-white">
          <div 
            className="p-4"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
        
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePrint}
            className="bg-[#91268F] hover:bg-[#7A1F79] text-white"
          >
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}