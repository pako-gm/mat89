import { useState, useEffect, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  File,
  Image as ImageIcon,
  Archive,
  ExternalLink,
  Trash2,
  AlertCircle,
  Paperclip
} from 'lucide-react';

interface DocumentoPedido {
  id: string;
  pedido_id: string;
  nombre_documento: string;
  url_onedrive: string;
  tipo_archivo: string;
  fecha_subida: string;
  usuario_email: string;
}

interface GuardarDocumentacionPedidoProps {
  pedidoId: string;
}

export function GuardarDocumentacionPedido({ pedidoId }: GuardarDocumentacionPedidoProps) {
  const [documentos, setDocumentos] = useState<DocumentoPedido[]>([]);
  const [nombreDoc, setNombreDoc] = useState('');
  const [urlDoc, setUrlDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Cargar documentos al montar el componente
  useEffect(() => {
    cargarDocumentos();
  }, [pedidoId]);

  // Validar que la URL sea de OneDrive
  const validarUrlOneDrive = (url: string): boolean => {
    const dominiosPermitidos = [
      '1drv.ms',
      'sharepoint.com',
      'onedrive.live.com',
      '-my.sharepoint.com'
    ];
    return dominiosPermitidos.some(dominio => url.includes(dominio));
  };

  // Extraer tipo de archivo del nombre
  const extraerTipoArchivo = (nombreDoc: string): string => {
    const partes = nombreDoc.split('.');
    return partes.length > 1 ? `.${partes[partes.length - 1].toLowerCase()}` : '';
  };

  // Obtener icono según tipo de archivo
  const obtenerIconoArchivo = (tipo: string): JSX.Element => {
    const className = "w-5 h-5 text-gray-600";

    switch (tipo) {
      case '.pdf':
        return <FileText className={className} />;
      case '.xlsx':
      case '.xls':
        return <File className={className} />;
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
        return <ImageIcon className={className} />;
      case '.zip':
      case '.rar':
        return <Archive className={className} />;
      default:
        return <File className={className} />;
    }
  };

  // Cargar documentos desde Supabase
  const cargarDocumentos = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('tbl_documentos_pedido')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('fecha_subida', { ascending: false });

      if (error) throw error;

      setDocumentos(data || []);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      toast({
        title: "Error",
        description: "Error al cargar documentos",
        variant: "destructive",
      });
    }
  };

  // Guardar documento
  const guardarDocumento = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    // Validaciones
    if (!nombreDoc.trim()) {
      toast({
        title: "Error",
        description: "El nombre del documento es requerido",
        variant: "destructive",
      });
      return;
    }

    if (!urlDoc.trim() || !validarUrlOneDrive(urlDoc)) {
      toast({
        title: "Error",
        description: "URL de OneDrive no válida. Debe contener '1drv.ms', 'sharepoint.com', 'onedrive.live.com' o '-my.sharepoint.com'",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Obtener usuario autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      const tipoArchivo = extraerTipoArchivo(nombreDoc);

      const documentoData = {
        pedido_id: pedidoId,
        nombre_documento: nombreDoc.trim(),
        url_onedrive: urlDoc.trim(),
        tipo_archivo: tipoArchivo,
        fecha_subida: new Date().toISOString(),
        usuario_email: user.email || 'Sin email',
      };

      // Insertar documento en Supabase
      const { error: insertError } = await supabase
        .from('tbl_documentos_pedido')
        .insert(documentoData);

      if (insertError) throw insertError;

      toast({
        title: "Éxito",
        description: "Documento guardado correctamente",
      });

      // Limpiar formulario, cerrar dialog y recargar lista
      setNombreDoc('');
      setUrlDoc('');
      setDialogOpen(false);
      await cargarDocumentos();
    } catch (error) {
      console.error('Error al guardar documento:', error);
      toast({
        title: "Error",
        description: "Error al guardar documento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Eliminar documento
  const eliminarDocumento = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tbl_documentos_pedido')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Documento eliminado correctamente",
      });

      await cargarDocumentos();
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      toast({
        title: "Error",
        description: "Error al eliminar documento",
        variant: "destructive",
      });
    }
  };

  // Formatear fecha a formato español
  const formatearFecha = (fecha: string): string => {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${año} ${horas}:${minutos}`;
  };

  return (
    <div className="space-y-4">
      {/* Header con título y botón Añadir */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Documentos adjuntos</h3>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Paperclip className="h-4 w-4" />
              Añadir
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adjuntar documentación al pedido</DialogTitle>
              <DialogDescription>
                <Alert className="bg-blue-50 border-l-4 border-blue-500 p-3 mt-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="ml-2">
                    <strong className="block mb-2 text-sm">Cómo adjuntar documentación:</strong>
                    <ol className="list-decimal ml-5 space-y-1 text-xs">
                      <li>Sube el archivo a tu OneDrive empresarial</li>
                      <li>Genera un enlace compartido (clic derecho → Compartir)</li>
                      <li>Pega el enlace en el formulario abajo</li>
                    </ol>
                    <a
                      href="https://support.microsoft.com/es-es/office/compartir-archivos-de-onedrive-9fcc2f7d-de0c-4cec-93b0-a82024800c07"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs mt-2 inline-flex items-center gap-1"
                    >
                      Ver guía completa <ExternalLink className="w-3 h-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              </DialogDescription>
            </DialogHeader>

            {/* Formulario dentro del popup */}
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="nombreDoc" className="text-sm font-medium text-gray-700">
                  Nombre del documento *
                </Label>
                <Input
                  id="nombreDoc"
                  type="text"
                  value={nombreDoc}
                  onChange={(e) => setNombreDoc(e.target.value)}
                  placeholder="Ej: Albarán de envío.pdf"
                  className="w-full border-gray-300 rounded-md focus:border-purple-600 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="urlDoc" className="text-sm font-medium text-gray-700">
                  Enlace de OneDrive *
                </Label>
                <Input
                  id="urlDoc"
                  type="url"
                  value={urlDoc}
                  onChange={(e) => setUrlDoc(e.target.value)}
                  placeholder="https://1drv.ms/..."
                  className="w-full border-gray-300 rounded-md focus:border-purple-600 mt-1"
                />
              </div>

              <Button
                type="button"
                onClick={(e) => guardarDocumento(e as any)}
                disabled={loading}
                className="w-full"
                style={{ backgroundColor: '#91268F' }}
              >
                {loading ? 'Guardando...' : 'Guardar Documento'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de documentos guardados */}
      {documentos.length === 0 ? (
        <div className="border rounded-md p-6 text-center text-gray-500">
          <p className="mb-1">No hay documentos adjuntos</p>
          <p className="text-sm">Usa el botón "Añadir" para adjuntar documentación al pedido</p>
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="p-3 hover:bg-gray-50 flex justify-between items-center transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {obtenerIconoArchivo(doc.tipo_archivo)}
                <div className="flex-1">
                  <a
                    href={doc.url_onedrive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    {doc.nombre_documento}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-xs text-gray-500">
                    Subido por {doc.usuario_email} el {formatearFecha(doc.fecha_subida)}
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:text-red-600 transition-colors"
                    aria-label="Eliminar documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. El documento "{doc.nombre_documento}" será eliminado permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => eliminarDocumento(doc.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
