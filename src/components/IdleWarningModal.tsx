import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface IdleWarningModalProps {
  /**
   * Controla si el modal está abierto o cerrado
   */
  open: boolean;

  /**
   * Tiempo restante en segundos antes del cierre automático
   */
  remainingTime: number;

  /**
   * Callback que se ejecuta cuando el usuario hace clic en "Continuar sesión"
   */
  onContinue: () => void;
}

/**
 * Modal de advertencia que se muestra antes del cierre automático de sesión
 * por inactividad. Incluye una cuenta regresiva y permite al usuario
 * continuar su sesión.
 */
export function IdleWarningModal({
  open,
  remainingTime,
  onContinue,
}: IdleWarningModalProps) {
  /**
   * Formatea el tiempo restante en formato MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-yellow-600">
            <Clock className="h-6 w-6" />
            <AlertDialogTitle>Sesión Inactiva</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-4">
            <p>
              Tu sesión se cerrará automáticamente por inactividad en:
            </p>
            <div className="flex justify-center">
              <div className="rounded-lg bg-yellow-50 border-2 border-yellow-200 px-6 py-4">
                <p className="text-3xl font-bold text-yellow-700 tabular-nums">
                  {formatTime(remainingTime)}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Haz clic en "Continuar sesión" para seguir trabajando o espera a
              que se cierre automáticamente para ahorrar recursos del sistema.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onContinue}
            className="bg-[#91268F] hover:bg-[#7a1f79] w-full sm:w-auto"
          >
            Continuar sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
