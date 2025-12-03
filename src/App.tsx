import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Layout from "@/components/layout/Layout";
import OrdersPage from "@/pages/OrdersPage";
import ReceptionsPage from "@/pages/ReceptionsPage";
import ProveedoresPage from "@/pages/ProveedoresPage";
import MaterialesPage from "@/pages/MaterialesPage";
import ConsultaPage from "@/pages/ConsultaPage";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PanelDeControl from "@/pages/PanelDeControl";
import MaestroAlmacenes from "@/pages/MaestroAlmacenes";
import MaestroVehiculos from "@/pages/MaestroVehiculos";
import VersionesPage from "@/pages/VersionesPage";
import SecurityAuditPage from "@/pages/SecurityAuditPage";
import BackupSistema from "@/pages/BackupSistema";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/react";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { IdleWarningModal } from "@/components/IdleWarningModal";

// Component to handle role-based redirection
function RoleBasedRedirect() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        if (sessionData.user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('user_role')
            .eq('user_id', sessionData.user.id)
            .maybeSingle();

          setUserRole(profileData?.user_role || 'CONSULTAS');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('CONSULTAS');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#91268F]"></div>
      </div>
    );
  }

  // Redirect based on user role
  if (userRole === 'CONSULTAS') {
    return <Navigate to="/consultar" replace />;
  } else {
    return <Navigate to="/pedidos" replace />;
  }
}

// Componente para manejar la redirección de recuperación de contraseña
function PasswordRecoveryHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Verificar si hay un hash de recuperación en la URL
    const hash = window.location.hash;

    if (hash) {
      // Parsear el hash para buscar parámetros de recuperación
      const params = new URLSearchParams(hash.substring(1));
      const type = params.get('type');
      const accessToken = params.get('access_token');

      // Si detectamos un token de acceso y type=recovery, redirigir a reset-password
      if (accessToken && type === 'recovery' && location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    }
  }, [navigate, location]);

  return null;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const { toast } = useToast();

  // Manejador de logout automático por inactividad
  const handleIdleTimeout = async () => {
    try {
      await signOut();
      toast({
        title: "Sesión cerrada por inactividad",
        description: "Tu sesión se ha cerrado automáticamente después de 15 minutos de inactividad.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error al cerrar sesión por inactividad:", error);
    }
  };

  // Hook de detección de inactividad (solo activo cuando hay sesión normal, no en modo recuperación)
  const { showWarning, remainingTime, resetTimer } = useIdleTimeout({
    timeout: 15 * 60 * 1000, // Cierra sesión tras 15 minutos de inactividad
    warningTime: 2 * 60 * 1000, // Advertencia 2 minutos antes
    onTimeout: handleIdleTimeout,
    enabled: !!session && !isRecoveryMode, // Solo activar cuando hay sesión activa y NO está en modo recuperación
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Detectar si es un evento de recuperación de contraseña
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setIsRecoveryMode(false);
        }

        setSession(session);
        setLoading(false);
      }
    );

    // Verificar sesión actual al cargar
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Detectar si estamos en modo de recuperación de contraseña al cargar
  useEffect(() => {
    // Verificar si hay un hash de recuperación en la URL
    const hash = window.location.hash;

    if (hash) {
      // Parsear el hash para buscar parámetros de recuperación
      const params = new URLSearchParams(hash.substring(1));
      const type = params.get('type');
      const accessToken = params.get('access_token');

      // Si detectamos un token de acceso y type=recovery, estamos en modo recuperación
      if (accessToken && type === 'recovery') {
        setIsRecoveryMode(true);
      }
    }
  }, []);

  const checkSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    } catch (error) {
      console.error("Error al verificar sesión:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#91268F]"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <PasswordRecoveryHandler />
      <Routes>
        {/* Rutas públicas */}
        <Route
          path="/login"
          element={!session || isRecoveryMode ? <LoginPage /> : <Navigate to="/" replace />}
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Rutas protegidas - solo cuando hay sesión real (no modo recuperación) */}
        {session && !isRecoveryMode ? (
          <Route path="/" element={<Layout />}>
            <Route index element={<RoleBasedRedirect />} />
            <Route path="pedidos" element={<OrdersPage />} />
            <Route path="pedidos/:id" element={<OrdersPage />} />
            <Route path="recepciones" element={<ReceptionsPage />} />
            <Route path="proveedores" element={<ProveedoresPage />} />
            <Route path="materiales" element={<MaterialesPage />} />
            <Route path="consultar" element={<ConsultaPage />} />
            <Route
              path="panel-control"
              element={
                <ProtectedRoute requiredRole="ADMINISTRADOR">
                  <PanelDeControl />
                </ProtectedRoute>
              }
            />
            <Route
              path="maestro-almacenes"
              element={
                <ProtectedRoute requiredRole="ADMINISTRADOR">
                  <MaestroAlmacenes />
                </ProtectedRoute>
              }
            />
            <Route
              path="maestro-vehiculos"
              element={
                <ProtectedRoute requiredRole="ADMINISTRADOR">
                  <MaestroVehiculos />
                </ProtectedRoute>
              }
            />
            <Route
              path="versiones"
              element={
                <ProtectedRoute requiredRole="ADMINISTRADOR">
                  <VersionesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="auditoria-seguridad"
              element={
                <ProtectedRoute requiredRole="ADMINISTRADOR">
                  <SecurityAuditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="backup-sistema"
              element={
                <ProtectedRoute requiredRole="ADMINISTRADOR">
                  <BackupSistema />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RoleBasedRedirect />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>

      {/* Modal de advertencia de inactividad (solo mostrar si NO está en modo recuperación) */}
      {!isRecoveryMode && (
        <IdleWarningModal
          open={showWarning}
          remainingTime={remainingTime}
          onContinue={resetTimer}
        />
      )}

      <Toaster />
      <Analytics />
    </BrowserRouter>
  );
}

export default App;