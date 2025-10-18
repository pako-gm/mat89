import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import OrdersPage from "@/pages/OrdersPage";
import ReceptionsPage from "@/pages/ReceptionsPage";
import ProveedoresPage from "@/pages/ProveedoresPage";
import MaterialesPage from "@/pages/MaterialesPage";
import ConsultaPage from "@/pages/ConsultaPage";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PanelDeControl from "@/pages/PanelDeControl";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/lib/supabase";

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

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
      <Routes>
        {!session ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
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
            {/* Add other routes here as they are developed */}
            <Route path="*" element={<RoleBasedRedirect />} />
          </Route>
        )}
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;