import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import OrdersPage from "@/pages/OrdersPage";
import ReceptionsPage from "@/pages/ReceptionsPage";
import ProveedoresPage from "@/pages/ProveedoresPage";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/lib/supabase";

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
            <Route index element={<Navigate to="/pedidos" replace />} />
            <Route path="pedidos" element={<OrdersPage />} />
            <Route path="pedidos/:id" element={<OrdersPage />} />
            <Route path="recepciones" element={<ReceptionsPage />} />
            <Route path="proveedores" element={<ProveedoresPage />} />
            {/* Add other routes here as they are developed */}
            <Route path="*" element={<Navigate to="/pedidos" replace />} />
          </Route>
        )}
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;