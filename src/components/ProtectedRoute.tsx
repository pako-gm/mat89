import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar autenticación
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsAuthenticated(false);
          setLoading(false);
          toast({
            title: "Acceso denegado",
            description: "Debes iniciar sesión para acceder a esta página",
            variant: "destructive",
          });
          return;
        }

        setIsAuthenticated(true);

        // Si se requiere un rol específico, verificarlo
        if (requiredRole) {
          const userRole = await getUserRole();

          if (userRole === requiredRole) {
            setHasPermission(true);
          } else {
            setHasPermission(false);
            toast({
              title: "Acceso denegado",
              description: "No tienes permisos para acceder a esta página",
              variant: "destructive",
            });
          }
        } else {
          // Si no se requiere rol específico, solo autenticación
          setHasPermission(true);
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        setIsAuthenticated(false);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [requiredRole, toast]);

  // Mostrar loading mientras verifica
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Redirigir si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir si no tiene permisos
  if (!hasPermission) {
    return <Navigate to="/pedidos" replace />;
  }

  // Renderizar children si todo está bien
  return <>{children}</>;
}